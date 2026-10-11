/* ==========================================================================
   Makkah Guide — offline Islamic calculations
   Prayer times, Qibla bearing and Hijri dates computed entirely in the
   browser from astronomical formulae. No network, no API, works offline.
   ========================================================================== */
(function () {
  'use strict';

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function dsin(d){return Math.sin(d*D2R);} function dcos(d){return Math.cos(d*D2R);}
  function dtan(d){return Math.tan(d*D2R);}
  function darcsin(x){return Math.asin(x)*R2D;} function darccos(x){return Math.acos(x)*R2D;}
  function darctan2(y,x){return Math.atan2(y,x)*R2D;}
  function darccot(x){return Math.atan(1/x)*R2D;}
  function fix(a,b){a=a-b*Math.floor(a/b); return a<0?a+b:a;}
  function fixAngle(a){return fix(a,360);} function fixHour(a){return fix(a,24);}

  /* ---------- Calculation methods ---------- */
  var METHODS = {
    makkah:   { name:'Umm al-Qura (Makkah)',        fajr:18.5, isha:'90 min' },
    mwl:      { name:'Muslim World League',          fajr:18,   isha:17 },
    isna:     { name:'ISNA (North America)',         fajr:15,   isha:15 },
    karachi:  { name:'Karachi (Univ. of Islamic Sci.)', fajr:18, isha:18 },
    egypt:    { name:'Egyptian General Authority',   fajr:19.5, isha:17.5 },
    gulf:     { name:'Gulf Region',                  fajr:19.5, isha:'90 min' },
    dubai:    { name:'UAE / Dubai',                  fajr:18.2, isha:18.2 }
  };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
    return {
      declination: darcsin(dsin(e) * dsin(L)),
      equation: q / 15 - fixHour(RA)
    };
  }

  /**
   * Compute prayer times.
   * @param {Date} date
   * @param {number} lat, lng
   * @param {number} tz      UTC offset in hours (e.g. 3 for Saudi Arabia)
   * @param {string} method  key of METHODS
   * @param {string} asrMode 'standard' (Shafi/Maliki/Hanbali, factor 1) or 'hanafi' (factor 2)
   * @returns {Object} map of name -> decimal hours (local)
   */
  function prayerTimes(date, lat, lng, tz, method, asrMode) {
    var p = METHODS[method] || METHODS.makkah;
    var asrFactor = (asrMode === 'hanafi') ? 2 : 1;
    var jDate = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);

    function midDay(t) {
      var eq = sunPosition(jDate + t).equation;
      return fixHour(12 - eq);
    }
    function sunAngleTime(angle, t, ccw) {
      var decl = sunPosition(jDate + t).declination;
      var noon = midDay(t);
      var num = -dsin(angle) - dsin(decl) * dsin(lat);
      var den = dcos(decl) * dcos(lat);
      var ratio = num / den;
      if (ratio > 1 || ratio < -1) return NaN;           // polar / extreme latitude
      var dt = (1 / 15) * darccos(ratio);
      return noon + (ccw ? -dt : dt);
    }
    function asrTime(factor, t) {
      var decl = sunPosition(jDate + t).declination;
      var angle = -darccot(factor + dtan(Math.abs(lat - decl)));
      return sunAngleTime(angle, t, false);
    }

    // initial guesses (as day fractions), then refine twice
    var t = { fajr:5/24, sunrise:6/24, dhuhr:12/24, asr:13/24, sunset:18/24, maghrib:18/24, isha:18/24 };
    for (var i = 0; i < 2; i++) {
      t.fajr    = sunAngleTime(p.fajr, t.fajr, true) / 24;
      t.sunrise = sunAngleTime(0.833, t.sunrise, true) / 24;
      t.dhuhr   = midDay(t.dhuhr) / 24;
      t.asr     = asrTime(asrFactor, t.asr) / 24;
      t.sunset  = sunAngleTime(0.833, t.sunset, false) / 24;
      t.maghrib = t.sunset;
      if (typeof p.isha === 'string') {
        t.isha = t.maghrib + (parseInt(p.isha, 10) / 60) / 24;
      } else {
        t.isha = sunAngleTime(p.isha, t.isha, false) / 24;
      }
    }

    var out = {};
    var shift = tz - lng / 15;
    ['fajr','sunrise','dhuhr','asr','sunset','maghrib','isha'].forEach(function (k) {
      var v = t[k] * 24 + shift;
      out[k] = isNaN(v) ? NaN : v;
    });
    out.dhuhr += 1 / 60;                 // small safety offset past true zenith
    out.midnight = out.fajr + 24 > out.maghrib
      ? out.maghrib + (fixHour(out.fajr - out.maghrib)) / 2
      : NaN;
    // Last third of the night (for tahajjud)
    var nightLen = fixHour(out.fajr - out.maghrib);
    out.lastThird = fixHour(out.maghrib + nightLen * 2 / 3);
    return out;
  }

  function fmt(h, use24) {
    if (isNaN(h)) return '—';
    h = fixHour(h + 0.5 / 60);
    var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    if (use24) return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
    var suf = hh < 12 ? 'AM' : 'PM';
    var h12 = hh % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + suf;
  }

  /* ---------- Qibla ---------- */
  function qiblaBearing(lat, lng) {
    var K = { lat: 21.4224779, lng: 39.8251832 };
    var dL = (K.lng - lng) * D2R;
    var p1 = lat * D2R, p2 = K.lat * D2R;
    var y = Math.sin(dL);
    var x = Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(dL);
    return fixAngle(Math.atan2(y, x) * R2D);
  }

  function greatCircleKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * D2R, dLng = (lng2 - lng1) * D2R;
    var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(lat1*D2R)*Math.cos(lat2*D2R)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /* ---------- Hijri (tabular civil calendar) ----------
     The Umm al-Qura calendar is set by observation and official decree,
     so a pure formula can differ by a day. An adjustment (-2..+2) is
     offered in the UI for exactly that reason.                        */
  var HIJRI_MONTHS = ['Muharram','Safar','Rabiʻ al-Awwal','Rabiʻ al-Thani','Jumada al-Ula',
    'Jumada al-Akhirah','Rajab','Shaʻban','Ramadan','Shawwal','Dhu al-Qaʻdah','Dhu al-Hijjah'];
  var HIJRI_MONTHS_AR = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة',
    'رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];

  function toHijri(date, adjust) {
    adjust = adjust || 0;
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + adjust);
    var jd = Math.floor(julian(d.getFullYear(), d.getMonth() + 1, d.getDate()) + 0.5);
    var l = jd - 1948440 + 10632;
    var n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    var j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
            Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
        Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    var month = Math.floor((24 * l) / 709);
    var day = l - Math.floor((709 * month) / 24);
    var year = 30 * n + j - 30;
    return { year: year, month: month, day: day,
             monthName: HIJRI_MONTHS[month - 1], monthNameAr: HIJRI_MONTHS_AR[month - 1] };
  }

  function fromHijri(hy, hm, hd) {
    var jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm -
             Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
    // JD -> Gregorian
    var l = jd + 68569;
    var n = Math.floor((4 * l) / 146097);
    l = l - Math.floor((146097 * n + 3) / 4);
    var i = Math.floor((4000 * (l + 1)) / 1461001);
    l = l - Math.floor((1461 * i) / 4) + 31;
    var j = Math.floor((80 * l) / 2447);
    var day = l - Math.floor((2447 * j) / 80);
    l = Math.floor(j / 11);
    var month = j + 2 - 12 * l;
    var year = 100 * (n - 49) + i + l;
    return new Date(year, month - 1, day);
  }

  window.Islamic = {
    METHODS: METHODS,
    HIJRI_MONTHS: HIJRI_MONTHS,
    HIJRI_MONTHS_AR: HIJRI_MONTHS_AR,
    prayerTimes: prayerTimes,
    fmt: fmt,
    qiblaBearing: qiblaBearing,
    greatCircleKm: greatCircleKm,
    toHijri: toHijri,
    fromHijri: fromHijri
  };
})();
