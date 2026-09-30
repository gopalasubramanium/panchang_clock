package com.eksaar.panchang;

import android.content.Context;
import android.util.AtomicFile;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;

/** On-device, versioned state. Backups are compatible with the native iOS app. */
final class NativeState {
    static final int MAX_BYTES = 512_000;
    static final String[] MONTHS = {"Chaitra","Vaishakha","Jyeshtha","Ashadha","Shravana","Bhadrapada","Ashwin","Kartika","Margashirsha","Pausha","Magha","Phalguna"};
    static final String[] TITHIS = {"Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami","Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima"};
    static final String[] LANGS = {"en","hi","bn","mr","te","ta","gu","kn","ml","pa","or","ur"};
    JSONObject data;
    final AtomicFile file;
    boolean writable = true, existed;
    String issue;
    NativeState(Context context) {
        file = new AtomicFile(new File(context.getFilesDir(),"native-state.json"));
        data = defaults(); existed = file.getBaseFile().exists();
        if (existed) try (InputStream in = file.openRead()) { data = parse(in); }
        catch (Exception e) { writable=false; issue="Your saved data could not be read. It has been kept intact. Export any new changes before closing, or import a valid backup to restore saving."; }
    }
    static JSONObject obj(String text) { try { return new JSONObject(text); } catch(JSONException e) { throw new IllegalArgumentException(e); } }
    static JSONObject copy(JSONObject x) { return obj(x.toString()); }
    static JSONObject put(JSONObject o,String key,Object value) { try { o.put(key,value); return o; } catch(JSONException e) { throw new IllegalArgumentException(e); } }
    static JSONObject defaults() { return obj("{\"schema\":1,\"location\":{\"name\":\"New Delhi\",\"lat\":28.6139,\"lon\":77.209,\"zone\":\"Asia/Kolkata\",\"elevation\":0},\"settings\":{\"convention\":\"amanta\",\"sunriseMode\":\"geometric\",\"lang\":\"en\",\"appearance\":\"system\",\"hour12\":false},\"places\":[],\"personal\":[]}"); }
    JSONObject location() { return data.optJSONObject("location"); }
    JSONObject settings() { return data.optJSONObject("settings"); }
    JSONArray personal() { return data.optJSONArray("personal"); }
    JSONArray places() { return data.optJSONArray("places"); }
    ZoneId zone() { return ZoneId.of(location().optString("zone")); }
    static void require(boolean value,String message) { if(!value)throw new IllegalArgumentException(message); }
    static void place(JSONObject p) throws JSONException {
        require(p!=null,"Missing place."); name(p.get("name"));
        for(String key:new String[]{"lat","lon"})require(p.get(key) instanceof Number,"Invalid coordinates.");
        double lat=p.getDouble("lat"),lon=p.getDouble("lon"),e=p.optDouble("elevation",0);
        require(Double.isFinite(lat)&&Double.isFinite(lon)&&Double.isFinite(e)&&Math.abs(lat)<=90&&Math.abs(lon)<=180&&e>=-500&&e<=9000,"Check the coordinates and elevation.");
        require(p.get("zone") instanceof String,"Invalid time zone."); ZoneId.of(p.getString("zone"));
    }
    static void name(Object value) { require(value instanceof String && !((String)value).trim().isEmpty() && ((String)value).length()<=80,"Enter a name of 1–80 characters."); }
    static void choice(JSONObject o,String key,String... allowed) throws JSONException { require(o.get(key) instanceof String && Arrays.asList(allowed).contains(o.getString(key)),"Invalid "+key+"."); }
    static void integer(JSONObject o,String key,int min,int max) throws JSONException { Object v=o.get(key);require(v instanceof Number && Double.isFinite(((Number)v).doubleValue()) && ((Number)v).doubleValue()==((Number)v).intValue() && o.getInt(key)>=min && o.getInt(key)<=max,"Invalid "+key+"."); }
    static void validate(JSONObject state) throws JSONException {
        integer(state,"schema",1,1);place(state.getJSONObject("location"));JSONObject prefs=state.getJSONObject("settings");
        choice(prefs,"convention","amanta","purnimanta");choice(prefs,"sunriseMode","geometric","apparent");choice(prefs,"lang",LANGS);choice(prefs,"appearance","system","light","dark");require(prefs.get("hour12") instanceof Boolean,"Invalid clock format.");
        JSONArray places=state.getJSONArray("places"),dates=state.getJSONArray("personal");require(places.length()<=12 && dates.length()<=200,"Too many saved places or dates.");
        for(int i=0;i<places.length();i++)place(places.getJSONObject(i));
        Set<String> ids=new HashSet<>();
        for(int i=0;i<dates.length();i++) { JSONObject d=dates.getJSONObject(i);name(d.get("name"));integer(d,"month",0,11);integer(d,"tithi",0,29);require(d.get("includeAdhika") instanceof Boolean,"Invalid leap-month rule.");String id=d.getString("id");require(UUID.fromString(id).toString().equalsIgnoreCase(id) && ids.add(id),"Duplicate or invalid date identifier."); }
    }
    static JSONObject parse(InputStream in) throws Exception {
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] b=new byte[8192];int n;
        while((n=in.read(b))!=-1){require(out.size()+n<=MAX_BYTES,"Choose an Eksaar backup smaller than 512 KB.");out.write(b,0,n);}
        JSONObject result=new JSONObject(out.toString(StandardCharsets.UTF_8.name()));validate(result);return result;
    }
    void save() throws Exception {
        require(writable,"The original saved file is unreadable and has been preserved. Export these changes or import a valid backup to restore saving.");validate(data);
        byte[] bytes=data.toString().getBytes(StandardCharsets.UTF_8);require(bytes.length<=MAX_BYTES,"Saved data is too large.");
        FileOutputStream out=null;
        try { out=file.startWrite();out.write(bytes);file.finishWrite(out);existed=true; } catch(Exception e){file.failWrite(out);throw e;}
    }
    static JSONObject legacy(String text) throws JSONException {
        JSONObject old=new JSONObject(text),next=defaults();
        if(old.has("location"))put(next,"location",old.getJSONObject("location"));
        JSONObject prefs=next.getJSONObject("settings");for(String k:new String[]{"convention","sunriseMode","lang","hour12"})if(old.has(k))put(prefs,k,old.get(k));
        if(old.has("theme"))put(prefs,"appearance",old.get("theme"));if(old.has("savedLocations"))put(next,"places",old.getJSONArray("savedLocations"));
        JSONArray dates=old.optJSONArray("personal");if(dates!=null)for(int i=0;i<dates.length();i++){JSONObject d=copy(dates.getJSONObject(i));put(d,"id",UUID.randomUUID().toString());if(!d.has("includeAdhika"))put(d,"includeAdhika",false);next.getJSONArray("personal").put(d);}
        validate(next);return next;
    }
    int merge(JSONObject backup) throws Exception {
        validate(backup);JSONObject next=copy(data);JSONArray dates=next.getJSONArray("personal");Set<String> ids=new HashSet<>();for(int i=0;i<dates.length();i++)ids.add(dates.getJSONObject(i).getString("id"));int before=dates.length();
        JSONArray incoming=backup.getJSONArray("personal");for(int i=0;i<incoming.length();i++){JSONObject d=incoming.getJSONObject(i);if(ids.add(d.getString("id")))dates.put(d);}
        validate(next);JSONObject original=data;boolean couldWrite=writable;data=next;writable=true;try{save();}catch(Exception e){data=original;writable=couldWrite;throw e;}return dates.length()-before;
    }
    static String tithi(int i) { return (i<15?"Shukla ":"Krishna ")+(i==29?"Amavasya":TITHIS[i%15]); }
}
