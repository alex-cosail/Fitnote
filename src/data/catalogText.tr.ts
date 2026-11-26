import { CatalogText } from '../domain/catalog/types';

// Turkish texts of the catalog, by exercise id. Missing ids fall back (catalogTexts.ts).
export const CATALOG_TEXT_TR: Record<string, CatalogText> = {
  "knee-push-ups": {
    name: "Diz Üstü Şınav",
    cue: "Dizler matta, omuzlardan dizlere düz çizgi, dirsekler gövdeye 45°.",
    details:
      "Eller omuzlardan biraz geniş, dizler matın üzerinde ve karın ile kalça sıkı olacak şekilde pozisyon al. Nefes alırken dirsekleri 45° açıyla geriye yönlendirip göğsünü mata yaklaştır. Nefes verirken gövdeni tek parça halinde yukarı it. Belin çukurlaşmasından veya kalçanın geride kalmasından kaçın.",
  },
  "incline-push-ups": {
    name: "Eğimli Şınav (Bench)",
    cue: "Eller bankta veya koltukta, vücut düz çizgide, dirsekler 45° açıda.",
    details:
      "Ellerini alçak bir banka, bara veya koltuk kenarına koy ve ayaklarını geriye alıp baştan topuğa düz bir hat kur. Nefes alırken dirsekleri 45° geriye bükerek göğsünü desteğe indir. Nefes verirken omuzları kulaklardan uzak tutarak kendini yukarı it. Başını öne uzatmaktan ve beli çukurlaştırmaktan kaçın.",
  },
  "feet-elevated-push-ups": {
    name: "Ayaklar Yüksekte Şınav",
    cue: "Ayaklar bankta veya duvarda, karın sıkı, göğsü ellerin hizasına indir.",
    details:
      "Ayak parmaklarını koltuğa, banka veya duvar barına koy; ellerini omuz hizasında yerleştir. Belin çukurlaşmaması için karın ve kalçayı sıkı tut. Nefes alırken dirsekleri 45° büküp üst göğsünü yere veya bara yaklaştır, nefes verirken güçlüce it. Kalçanın aşağı düşmesinden ve dirseklerin yana açılmasından kaçın.",
  },
  "banded-push-ups": {
    name: "Bantlı Şınav",
    cue: "Direnç bandı kürek kemiklerinden geçip avuç altında sabitlenir, omuzlar aşağıda.",
    details:
      "Bandı boynunun altından, kürek kemiklerinin üzerinden geçir ve uçlarını ellerinin altında sabitle. Karın ve kalçayı sıkarak düz plank pozisyonu al. Nefes alırken kontrollü alçal, nefes verirken artan bant direncine karşı kolları tamamen kilitle. Bandın boyna kaymasından ve belin düşmesinden kaçın.",
  },
  "suspension-push-ups": {
    name: "Askı Kayışı Şınavı",
    cue: "Vücut kayışlarda gergin ve düz, kayışlar ön kola sürtmeden göğsü indir.",
    details:
      "Askı kayışlarının tutamaçlarını kavra, ayak parmakların üzerinde durarak baştan topuğa düz bir plank kur. Kürek kemiklerini sabitleyip nefes alırken göğsünü iki elin arasına kontrollü indir. Nefes verirken elleri merkeze doğru iterek başlangıca dön. Kalçanın düşmesinden ve omuzların öne yuvarlanmasından kaçın.",
  },
  "archer-push-ups": {
    name: "Okçu Şınavı",
    cue: "Geniş el tutuşu, ağırlığı çalışan kola aktarırken diğer kolu düz tut.",
    details:
      "Ellerini omuzlardan oldukça geniş şekilde mat veya uzun alçak bank üzerine yerleştir ve parmakları hafifçe dışa çevir. Nefes alırken ağırlığı tek kola kaydırıp göğsünü o ele yaklaştır, diğer kolu yana düz uzat. Nefes verirken kalçayı döndürmeden merkeze it. Beli düşürmekten veya destek kolu bükmekten kaçın.",
  },
  "scapular-wall-slides": {
    name: "Duvarda Kürek Kemiği Kaydırma",
    cue: "Belini duvara veya direğe yasla, omuzları kaldırmadan kolları yukarı kaydır.",
    details:
      "Sırtını duvara veya dikey direğe yasla, dizleri hafif büküp bel, kürek kemikleri ve başı temas halinde tut. Kollarını W harfi gibi yerleştir ve el sırtlarını yüzeye değdir. Nefes verirken kaburgaları açmadan kolları Y şekline kaydır, nefes alırken indir. Beli çukurlaştırmaktan veya bilekleri ayırmaktan kaçın.",
  },
  "incline-pike-push-ups": {
    name: "Eğimli Pike Şınav",
    cue: "Eller koltukta veya bankta, kalça yukarıda, başı ellerin önündeki noktaya indir.",
    details:
      "Ellerini koltuk veya alçak bank kenarına koyup kalçanı ters V şeklinde yukarı kaldır. Nefes alırken dirsekleri 45° geriye bükerek başını ellerin biraz önüne doğru alçalt. Nefes verirken aynı yay boyunca yukarı iterek omuzları aç. Dirsekleri yana açmaktan ve alnı doğrudan ellerin arasına indirmekten kaçın.",
  },
  "band-overhead-press": {
    name: "Bantla Baş Üstü Pres",
    cue: "Bant ayak altında, beli çukurlaştırmadan ve kaburgaları açmadan yukarı it.",
    details:
      "İki ayağınla bandın ortasına bas, bandın üst kısmını köprücük kemiği hizasında tut ve dirsekleri hafif öne al. Kalça ve karnı sıkarak gövdeyi sabitle. Nefes verirken kolları başın tam üzerine düz it, nefes alırken kontrollü indir. Geriye yaslanmaktan veya beli bükmekten kaçın.",
  },
  "half-kneeling-db-press": {
    name: "Tek Diz Üstünde Dambıl Pres",
    cue: "Dambıl yerdeki diz tarafında, kalça ve karın sıkı, dikey yukarı it.",
    details:
      "Tek dizin matta olacak şekilde pozisyon al; dambılı yerdeki dizle aynı elinde, dirseği hafif önde tut. Arka kalçayı ve karnı sıkarak yana eğilmeyi engelle. Nefes verirken dambılı kulağının hizasına dik it, nefes alırken 2 saniyede indir. Beli bükmekten veya yana yatmaktan kaçın.",
  },
  "elevated-pike-push-ups": {
    name: "Ayaklar Yüksekte Pike Şınav",
    cue: "Ayaklar bankta veya koltukta, gövde neredeyse dik, başı ellerin önüne indir.",
    details:
      "Ayak parmaklarını koltuk, bank veya duvar barına koy ve kalçan omuzların üzerine gelene dek ellerinle yaklaş. Nefes alırken dirsekleri 45° geriye bükerek başını ellerin önündeki üçgen noktaya indir. Nefes verirken güçlüce yukarı it. Gövde açısını düzleştirip normal şınava kaymaktan kaçın.",
  },
  "wall-handstand-hold": {
    name: "Duvarda Amut Tutuşu",
    cue: "Yüzün duvara dönük, yeri omuzlarla aktif it, belini düz ve karnını sıkı tut.",
    details:
      "Ayakların duvara dayalı şınav pozisyonundan adımlayarak yukarı çık ve ellerini duvardan 20–30 cm mesafeye getir. Karın ve kalçayı sıkıp omuzlarla yeri sürekli yukarı doğru it. Düzenli nefes al ve yorgunluk artmadan kontrollü şekilde yana adım atarak in. Belin aşırı çukurlaşmasından ve nefesi tutmaktan kaçın.",
  },
  "prone-ywt-raises": {
    name: "Yüzüstü Y-W-T Kaldırış",
    cue: "Matta yüzüstü yat, alın yerde, başparmaklar yukarıda kürek kemiklerini sıkıştır.",
    details:
      "Mat üzerine yüzüstü uzan, alnını hafifçe yere yasla ve beli korumak için karnı hafif sık. Kollarını sırayla Y, W ve T şekillerinde başparmaklar yukarı bakacak biçimde kaldırıp tepede 1 saniye bekle. Kaldırırken nefes ver, indirirken al. Boynu yukarı kaldırmaktan ve omuzları kulaklara çekmekten kaçın.",
  },
  "seated-band-row": {
    name: "Oturarak Bant Çekişi",
    cue: "Dik otur, bandı ayak tabanlarına sabitle, dirsekleri alt kaburgalara çek.",
    details:
      "Dizler hafif bükülü dik oturarak bandı ayak tabanlarının ortasına geçir; omuzları aşağı indir. Nefes verirken önce kürek kemiklerini yaklaştır ve elleri alt kaburgalarına çekip 1 saniye bekle, nefes alırken kontrollü uzat. Beli kamburlaştırmaktan veya gövdeyi geriye savurmaktan kaçın.",
  },
  "single-arm-db-row": {
    name: "Tek Kol Dambıl Çekişi",
    cue: "Serbest el koltukta veya bankta, sırt düz, dambılı kalça hizasına yay çizerek çek.",
    details:
      "Bir elini koltuğa veya banka daya, ayaklarını dengeli biçimde aç ve sırtını düz tut. Nefes verirken dambılı koltukaltına değil, kürek kemiğini sıkarak geriye kalça cebine doğru çek. Nefes alırken omzu döndürmeden 2 saniyede indir. Gövdeyi yukarı döndürmekten kaçın.",
  },
  "suspension-row": {
    name: "Askı Kayışı Çekişi",
    cue: "Vücut düz çizgide, göğsü tutamaçlara çekip kürek kemiklerini sıkıştır.",
    details:
      "Kayışların tutamaçlarını kavra ve ayaklarını öne yürütüp topuklar üzerinde sabit açı oluştur; karın ve kalçayı sık. Nefes verirken avuçları gövdeye döndürüp göğsü ellere çek, kürek kemiklerini birleştir. Nefes alırken omuzları salmadan yavaşça in. Kalçayı düşürmekten ve başı öne uzatmaktan kaçın.",
  },
  "band-face-pull": {
    name: "Bantla Yüz Çekişi (Face Pull)",
    cue: "Bant göz hizasında sabit, alına doğru çekip başparmakları geriye çevir.",
    details:
      "Bandı göz hizasında bir direğe sabitle ve dengeli bir adım duruşuna geç. Nefes verirken dirsekleri omuz hizasında tutup elleri alnına çek, başparmakları geriye doğru dışa çevir. 1 saniye sıkıp kontrollü bırak. Beli geriye bükmekten veya dirsekleri aşağı düşürmekten kaçın.",
  },
  "feet-elevated-australian-pull-ups": {
    name: "Ayaklar Yüksekte Avustralya Barfiks",
    cue: "Topuklar bankta veya duvarda, gövde yatay ve düz, göğsü bara değdir.",
    details:
      "Alçak barı omuz genişliğinde üstten kavra ve topuklarını ellerle aynı yükseklikteki bank veya bar basamağına yerleştir. Kalçayı sıkarak vücudu düz bir yatay hatta kilitle. Nefes verirken kürek kemiklerini sıkıştırarak göğsünü bara çek, nefes alırken 2 saniyede in. Yarım çekişlerden ve kalça sarkmasından kaçın.",
  },
  "split-stance-explosive-band-row": {
    name: "Hamle Duruşunda Patlayıcı Tek Kol Bant Çekişi",
    cue: "Dengeli hamle duruşu, beli hiç döndürmeden tek kolla patlayıcı çekiş ve yavaş dönüş.",
    details:
      "Evde bandı ön ayağın altına, dışarıda bel hizasındaki direğe sabitleyip alçak bir hamle duruşuna geç. Gövdenin dönmesini engellemek için karın ve yan karın kaslarını kilitle. Keskin bir nefesle dirseği yarım saniyede kaburgaya doğru patlayıcı biçimde çek ve 2 saniyede kontrollü uzat. Beli bükmekten ve omzu öne bırakmaktan kaçın.",
  },
  "suspension-single-arm-row": {
    name: "Tek Kol Askı Kayışı Çekişi",
    cue: "Tek el kayışta, omuzlar ve kalça yere paralel, gövdeyi hiç döndürmeden çek.",
    details:
      "Tek tutamacı kavra, dönmeyi önlemek için ayaklarını omuzdan geniş veya çapraz şekilde topuklara yerleştir. Nefes verirken serbest omzu aşağı düşürmeden göğsünü çalışan ele doğru çek. Nefes alırken kontrollü biçimde başlangıca in. Üst noktada gövdeyi döndürerek hile yapmaktan kaçın.",
  },
  "scapular-pull-ups": {
    name: "Kürek Kemiği Barfiksi",
    cue: "Dirsekler tamamen düz, sadece kürek kemiklerini aşağı bastırarak göğsü yükselt.",
    details:
      "Barfikse omuz genişliğinde üstten asıl, bacakları hafif önde tut ve dirsekleri hiç bükme. Nefes verirken omuzları kulaklardan uzaklaştırıp kürek kemiklerini aşağı çek, 1 saniye bekle. Nefes alırken kontrollü asılışa dön. Dirsekleri bükmekten ve beli çukurlaştırmaktan kaçın.",
  },
  "negative-pull-ups": {
    name: "Negatif Barfiks",
    cue: "Banktan veya duvar barından çeneyi barın üstüne al, 4–5 saniyede yavaşça in.",
    details:
      "Alçak bank veya basamaktan destek alarak çenen barın üzerinde olacak şekilde üst pozisyona çık ve gövdeyi sık. Tepede 1 saniye bekle, ardından nefes alarak kollar neredeyse düzleşene dek 4–5 saniyede kontrollü in. İnişin alt yarısında hızlanıp kendini bırakmaktan kaçın.",
  },
  "band-assisted-pull-ups": {
    name: "Bant Destekli Barfiks",
    cue: "Bandı bara bağlayıp ayağının veya dizinin altına al, sallanmadan yukarı çek.",
    details:
      "Direnç bandını barfiks demirine geçir ve bir ayağını ya da dizini halkaya sabitleyip diğer bileğini üzerine kilitle. Önce kürek kemiklerini aşağı çek, sonra nefes vererek çeneni barın üzerine çıkar. Nefes alırken 2 saniyede kontrollü in. Karın kaslarını bırakıp bacaklarla sallanmaktan kaçın.",
  },
  "chin-ups": {
    name: "Ters Tutuş Barfiks (Chin-Up)",
    cue: "Avuçlar sana dönük omuz genişliğinde tut, dirsekleri kaburgalara çek.",
    details:
      "Barı omuz genişliğinde avuç içleri sana bakacak şekilde kavra ve karnını sık. Nefes verirken omuzları aşağı bastırıp dirsekleri gövdene doğru çekerek çeneni barın üzerine çıkar. Nefes alırken omuzları öne düşürmeden 2 saniyede in. Çeneyi ulaştırmak için boynu öne uzatmaktan kaçın.",
  },
  "chest-to-bar-pull-ups": {
    name: "Göğüsten Bara Barfiks",
    cue: "Güçlü kürek kemiği çekişiyle yüksel, üstte hafif geriye yaslanıp göğsü bara değdir.",
    details:
      "Barı omuzlardan biraz geniş üstten kavra ve gövdeyi sıkı tut. Güçlü bir nefesle patlayıcı biçimde yukarı çek, üst bölümde gövdeyi hafifçe geriye alıp kürek kemiklerini sıkarak üst göğsü bara değdir. Nefes alırken 2 saniyede kontrollü in. Omuzları öne düşürmekten ve bacaklarla savrulmaktan kaçın.",
  },
  "archer-pull-ups": {
    name: "Okçu Barfiksi",
    cue: "Geniş tutuş, göğsü tek ele doğru çekip diğer kolu bar boyunca düz uzat.",
    details:
      "Barı omuzlardan oldukça geniş kavra ve gövdeyi sabitle. Nefes verirken göğsünü bir eline doğru yukarı çek, karşı kolu bar boyunca düz tutarak sadece hafif destek al. Nefes alırken ortaya kontrollü in. Hızlı düşmekten veya düz destek kolunu bükmekten kaçın.",
  },
  "box-squats": {
    name: "Bank Dokunuşlu Squat",
    cue: "Oturup gevşemeden banka veya koltuğa hafifçe dokun, dizler ayak ucunu izlesin.",
    details:
      "Alçak bankın veya koltuğun bir adım önünde dur, ayakları omuz genişliğinde açıp parmak uçlarını hafif dışa çevir. Nefes alırken kalçayı geriye vererek desteğe hafifçe değene dek kontrollü in. Nefes verirken dizleri içe düşürmeden ayak tabanlarıyla güçlüce kalk. Koltuğa kendini bırakmaktan ve dizleri içe kırmaktan kaçın.",
  },
  "air-squats": {
    name: "Vücut Ağırlığı Squat",
    cue: "Topuklar yerde, göğüs açık, uyluklar yere paralel olana dek in.",
    details:
      "Ayakları kalça genişliğinden biraz açık koy, parmak uçlarını hafif dışa çevir ve karnı sık. Nefes alırken kalçayı geriye verip dizleri bükerek uyluklar yere paralel olana kadar alçal, denge için kolları öne uzat. Nefes verirken topukları yerden kaldırmadan yukarı it. Altta beli yuvarlamaktan ve topukları kaldırmaktan kaçın.",
  },
  "goblet-squat": {
    name: "Goblet Squat",
    cue: "Ağırlığı göğsüne yakın tut, altta dirseklerini dizlerinin iç kısmına yönlendir.",
    details:
      "Dambılı veya giryayı göğüs kemiğine dayalı dikey biçimde iki elinle tut, omuzları aşağıda sabitle. Nefes alırken dik sırtla aşağı inip dirseklerinle dizleri hafifçe dışa yönlendir. Nefes verirken gövdeyi öne düşürmeden ayakların ortasından iterek kalk. Ağırlığı göğüsten uzaklaştırmaktan kaçın.",
  },
  "cossack-squat": {
    name: "Kazak Squat (Cossack Squat)",
    cue: "Geniş duruşta tek bacağa derin in, diğer bacak topuk üzerinde düz ve parmak yukarıda.",
    details:
      "Ayaklarını oldukça geniş açıp parmak uçlarını 30–45° dışa çevir. Nefes alırken ağırlığı tek tarafa kaydırıp çalışan topuğu yerden kaldırmadan derin çök, diğer bacağı topuğu üzerinde düz tutup parmağı yukarı çevir. Nefes verirken kontrollü biçimde merkeze it. Çalışan topuğu kaldırmaktan kaçın.",
  },
  "single-leg-bench-squat": {
    name: "Bank Üzerine Tek Bacak Squat",
    cue: "Tek bacakla 3 saniyede banka veya koltuğa hafifçe dokun, diz parmak hizasında.",
    details:
      "Alçak bankın veya koltuğun önünde tek ayak üzerinde dur, serbest bacağını ve kollarını denge için öne uzat. Nefes alırken dizini ayak ucuna paralel tutarak 3 saniyede kalçanı desteğe hafifçe değdir. Nefes verirken savrulmadan tek bacakla yukarı it. Son anda hızla oturmaktan ve dizi içe kırmaktan kaçın.",
  },
  "split-squats": {
    name: "Sabit Split Squat",
    cue: "Geniş adım duruşunda dikey alçal, arka dizi yere vurmadan 90° açıya in.",
    details:
      "Ayaklarını tek çizgiye değil kalça genişliğinde iki ayrı ray gibi yerleştirip arka topuğu kaldır. Nefes alırken ön uyluk yere paralel olana dek dikey in ve arka dizi yere değdirmeden dur. Nefes verirken ön topuktan güç alarak yukarı çık. Ayakları tek hizada tutmaktan veya öne eğilmekten kaçın.",
  },
  "bench-step-ups": {
    name: "Alçak Banka Çıkış (Step-Up)",
    cue: "Tüm ayak bankta, alttaki ayakla itmeden sadece üst bacağın topuğuyla yüksel.",
    details:
      "Çalışan ayağını tam olarak alçak bankın üzerine yerleştir ve düz gövdeni hafifçe öne eğ. Nefes verirken alttaki ayak parmağını yukarı çekerek yerden sekmeden sadece üst bacakla yukarı çık. Nefes alırken dizi içe kaçırmadan 2–3 saniyede yavaşça in. Alttaki bacakla itiş yapmaktan kaçın.",
  },
  "side-lunges": {
    name: "Yana Hamle (Lateral Lunge)",
    cue: "Yana geniş adım atarken kalçayı geriye oturt, her iki ayak da yere tam bassın.",
    details:
      "Dik dur ve ayaklarını birleştir. Nefes alırken yana geniş bir adım at ve kalçayı geriye vererek adım attığın bacağa çökerken diğer bacağı düz tut. Nefes verirken bükülü bacaktan iterek merkeze dön. Kalçayı geriye vermeden dizi öne taşırmaktan kaçın.",
  },
  "skater-squats": {
    name: "Paten Squat (Skater Squat)",
    cue: "Arka ayağı havada geride tut, arka dizle mata çarpmadan hafifçe dokun ve kalk.",
    details:
      "Tek bacak üzerinde dengelen, diğer dizini arkada bükülü tutup kollarını denge için öne uzat. Nefes alırken arka diz mata yumuşakça dokunana kadar kontrollü çök. Nefes verirken ağırlığı arka ayağa vermeden tek bacakla yüksel. Dizi yere sert vurmaktan kaçın.",
  },
  "suspension-pistol-squat": {
    name: "Askı Destekli Tek Bacak Pistol Squat",
    cue: "Kayışları sadece hafif denge için tut, kollarla çekmeden tek bacakla tam çök.",
    details:
      "Askı kayışlarını göğüs önünde hafifçe tut ve bir bacağını düz şekilde öne uzat. Nefes alırken kollarla çekmeden, ağırlığı topukta tutarak tek bacakla derine in. Nefes verirken yalnızca bacak gücüyle yukarı it. Kendini kollarınla yukarı çekmekten kaçın.",
  },
  "glute-bridge": {
    name: "Kalça Köprüsü (Glute Bridge)",
    cue: "Topuklarla yere bas, tepede kalçayı sıkarak 2 saniye bekle, beli bükme.",
    details:
      "Matta sırtüstü yat, dizleri büküp ayakları kalçaya yakın ve kalça genişliğinde yerleştir. Nefes verirken topuklardan iterek dizlerden omuzlara düz bir hat oluşana dek kalçayı kaldır ve tepede 2 saniye kalçayı sık. Nefes alırken yavaşça indir. Beli aşırı yukarı büküp zorlamaktan kaçın.",
  },
  "band-good-morning": {
    name: "Bantla Good Morning",
    cue: "Bant ayak altında ve üst sırtta, düz omurga ile kalçayı geriye it.",
    details:
      "İki ayağınla bandın alt ucuna bas, üst ucunu boynuna değil üst sırtına yerleştir ve dizleri hafif kilitle. Nefes alırken sırtını düz tutarak kalçanı geriye it ve arka bacakta gerginlik hissedene dek öne eğil. Nefes verirken kalçanı sıkarak doğrul. Sırtı yuvarlamaktan ve dizleri fazla büküp çömelmekten kaçın.",
  },
  "db-romanian-deadlift": {
    name: "Dambıl Romen Deadlift",
    cue: "Ağırlığı bacaklara sürterek indir, nötr sırtla kalçayı geriye it.",
    details:
      "Dambılı iki elinle uyluklarının önünde tut, ayakları kalça genişliğinde aç ve kürek kemiklerini sabitle. Nefes alırken kalçanı geriye itip ağırlığı bacaklarına yakın tutarak kaval kemiğinin ortasına dek in. Nefes verirken kalçanı sıkarak doğrul. Ağırlığı bacaklardan uzaklaştırmaktan ve sırtı bükmekten kaçın.",
  },
  "single-leg-rdl": {
    name: "Tek Bacak Romen Deadlift",
    cue: "Kalça kemikleri yere paralel kalsın, gövde ve arka bacak tek bir düz hat gibi hareket etsin.",
    details:
      "Hafif bükülü tek bacak üzerinde dengelen, kalçayı düz tut. Nefes alırken sırtını bozmadan öne eğil ve arka bacağını gövdeyle aynı hizada geriye uzat; gerekirse bir parmakla duvardan hafif destek al. Nefes verirken basan kalçanın gücüyle dikel. Kalkan bacağın kalçasını yana açmaktan kaçın.",
  },
  "nordic-curl-negatives": {
    name: "Nordik Arka Bacak Negatif",
    cue: "Topuklar koltuk altında sabit, kalça düz, öne düşüşü arka bacakla olabildiğince yavaşlat.",
    details:
      "Dizlerinin altına katlı mat koy ve bileklerini ağır bir koltuğun altına sabitleyip kalçayı düz tut. Kalça ve karnı sıkarak nefes alırken gövdeni düz bir parça halinde arka bacak freniyle mümkün olduğunca yavaş öne indir. Altta ellerinle yumuşakça yakalayıp kendini başlangıca it. Kalçadan bükülmekten kaçın.",
  },
  "dead-bug": {
    name: "Dead Bug (Ölü Böcek)",
    cue: "Belini mata tamamen yapıştır, yavaş nefes verirken çapraz kol ve bacağı uzat.",
    details:
      "Sırtüstü yat, kolları tavana kaldırıp dizleri kalça hizasında 90° bük ve bel boşluğunu tamamen kapat. Yavaşça nefes verirken beli yerden kaldırmadan bir bacağı yere yakın uzatıp karşı kolu başının gerisine götür. Nefes alırken merkeze dönüp taraf değiştir. Bacağı indirirken belin açılmasından kaçın.",
  },
  "bird-dog": {
    name: "Bird-Dog",
    cue: "Dört ayak pozisyonunda kalçayı hiç döndürmeden çapraz kol ve bacağı yatay uzat.",
    details:
      "Eller omuzların, dizler kalçanın altında ve omurga nötr olacak şekilde pozisyon al. Nefes verirken bir kolunu öne, karşı bacağını ise kalça hizasını geçmeden geriye uzatıp 1 saniye bekle. Nefes alırken kontrollü dön. Topuğu çok yukarı savurmaktan ve kalçayı yana devirmekten kaçın.",
  },
  "high-plank": {
    name: "Düz Kol Plank",
    cue: "Eller bankta veya matta düz, kalça ve karın sıkı, düzenli nefesle pozisyonu koru.",
    details:
      "Ellerini omuzlarının tam altına yerleştir (dışarıda alçak bankta, evde matta), ayak parmaklarına basıp dirsekleri dik tut. Kalçanı hafifçe içeri toplayıp karın ve kalçayı sık, omuzlarla desteği hafifçe it. Süre boyunca düzenli nefes al. Belin sarkmasından ve kürek kemiklerinin çökmesinden kaçın.",
  },
  "hanging-knee-raises": {
    name: "Asılı Diz Çekişi",
    cue: "Nefes verirken dizlerle birlikte kalçayı da göğse doğru kıvır, sallanmadan indir.",
    details:
      "Barfiks barına asıl veya sırtını duvar barına yaslayıp omuzlarını hafif aktif tut. Nefes verirken yalnızca bacakları değil, kalçanı da yukarı kıvırarak dizleri göğüs hizasına çek. Nefes alırken sallanmaya izin vermeden yavaşça indir. İvme kullanmaktan ve kalçayı kıvırmayı unutmaktan kaçın.",
  },
  "hollow-body-hold": {
    name: "Hollow Body Tutuşu",
    cue: "Kürek kemikleri ve düz bacaklar havada, bel mata sımsıkı yapışık kalsın.",
    details:
      "Mat üzerine sırtüstü yat ve kaburgalarını kalçana yaklaştırıp belini yere tam bastır. Kürek kemiklerini ve bitişik düz bacaklarını yerden hafifçe kaldırarak muz şekli oluştur; bacak yüksekliğini belin yerden açılmayacağı açıda tut. Süre boyunca akıcı nefes al. Bacakları bel kontrolünü kaybedecek kadar indirmekten kaçın.",
  },
  "suspension-fallout": {
    name: "Ayakta Askı Kayışı İleri Uzatma (Fallout)",
    cue: "Ayakta eğik plank pozisyonunda kolları baş önüne uzatırken beli hiç çukurlaştırma.",
    details:
      "Yüzün askı noktasına ters yönde, ayak parmakların üzerinde durarak kayışları göğüs önünde tut ve eğik plank kur. Nefes alırken karın ve kalçayı sertçe sıkıp düz kolları başın üzerine doğru uzat. Nefes verirken kolları kontrollü biçimde omuz altına geri çek. Kollar uzarken belin aşağı sarkmasından kaçın.",
  },
  "hanging-leg-raises": {
    name: "Asılı Düz Bacak Kaldırma",
    cue: "Dizler düz asılı pozisyonda, sallanmadan nefes vererek bacakları yukarı kaldır.",
    details:
      "Barfiks barına asıl ve omuzlarını hafifçe aktif tutup bacaklarını dizlerden düzleştir. Nefes verirken kalçayı da yukarı kıvırarak düz bacakları yatay hizaya veya bara doğru kontrollü kaldır. Nefes alırken 2 saniyede sallanmadan indir. Bacakları hızla aşağı bırakmaktan ve dizleri bükmekten kaçın.",
  },
  "l-sit-hold": {
    name: "Paralel Barda L-Sit Tutuşu",
    cue: "Paralel barda omuzları aşağı bastır, düz bacakları yere tam paralel tut.",
    details:
      "Paralel barlara düz kollarla bas ve omuzlarını kulaklarından olabildiğince aşağı it. Karın ve ön bacak kaslarını sıkarak bitişik düz bacaklarını gövdene 90° açıyla yatayda sabitle. Tutuş boyunca kontrollü nefes al. Omuzların içine çökmekten ve topukları düşürmekten kaçın.",
  },
  "suitcase-march": {
    name: "Tek El Bavul Yürüyüşü (Suitcase March)",
    cue: "Dambıl tek elde yanda, omuzları ve kalçayı hiç eğmeden yerinde kontrollü diz çek.",
    details:
      "Dambılı bir elinde kalçandan hafif açıkta tut, başını yukarı uzatıp iki omzunu eşit hizada sabitle. Yükün olduğu tarafa veya tersine hiç yatmadan dizlerini sırayla kalça hizasına kaldırıp 1 saniye bekle. Düzenli nefes al. Ağırlık taşıyan omzu düşürmekten ve acele etmekten kaçın.",
  },
  "copenhagen-plank-short": {
    name: "Kısa Kol Kopenhag Plank",
    cue: "Yan ön kol plankta üst diz koltuk üzerinde, kalçayı düz bir çizgide havada tut.",
    details:
      "Koltuk yanında dirsek omuz altında yan plank kur; bükülü üst dizini ve kaval kemiğini koltuk kenarına yerleştirip alttaki bacağı yerden kaldır. Kalçanı öne arkaya döndürmeden düz bir yatay hatta sabitle. Süre boyunca düzenli nefes al. Kalçayı aşağı bırakmaktan kaçın.",
  },
  "swedish-wall-side-hold": {
    name: "Duvar Barında Yan Tutuş (Side Hold)",
    cue: "Duvar barına yan dur: üst el çekerken alt düz kol iter, dizleri toplayıp yan gövdeyi tut.",
    details:
      "Duvar barına yan dur, üst elinle baş üstündeki barı kavra ve alt düz kolunla kalça hizasındaki bara sağlamca bas. Ayaklarını yerden kesip dizlerini göğse toplayarak gövdeni yana dönmeden yatay pozisyonda tut. Süre boyunca düzenli nefes al. Alttaki iten dirseği bükmekten kaçın.",
  },
  "plank-shoulder-taps": {
    name: "Plankta Omuza Dokunuş",
    cue: "Ayaklar biraz açık, kalçayı hiç sallamadan nefes vererek karşı omza yavaşça dokun.",
    details:
      "Mat veya alçak bank üzerinde düz kol plank kur ve denge için ayaklarını omuzlardan biraz geniş aç. Nefes verirken kalçanı hiç oynatmadan bir elini kaldırıp karşı omzuna 1 saniye dokun. Nefes alırken elini yumuşakça koy ve taraf değiştir. Kalçayı sağa sola savurmaktan kaçın.",
  },
  "split-stance-band-anti-rotation": {
    name: "Hamle Duruşunda Bantla Dönüş Önleme Tutuşu",
    cue: "Direğe yan alçak hamle duruşunda dur, gergin bandı düz kollarla göğüs merkezinde tut.",
    details:
      "Bandı göğüs hizasında duvar barına sabitle, direğe yan dönüp dizler hafif bükülü alçak bir hamle duruşu al ve güçlü gerginlik oluştur. Kollarını göğüs tam ortasından düz öne uzat ve dönme kuvvetine karşı merkezde tut. Süre boyunca düzenli nefes al. Ellerin sabit noktaya doğru kaymasına izin vermekten kaçın.",
  },
  "incline-australian-pull-ups": {
    name: "Avustralya Barfiksi 45°",
    cue: "Bar göğüs hizasında, vücut 45°, kürek kemiklerini sıkarak göğsünü bara çek.",
    details:
      "Göğüs hizasındaki barı omuz genişliğinde düz tutuşla kavra ve ayaklarını öne alarak vücudunu yaklaşık 45° açıyla düz bir çizgi yap. Nefes verirken kürek kemiklerini sıkıp dirsekleri geriye sürerek göğsünü bara çek; nefes alırken kontrollü in. Bar alçaldıkça ve vücut yataylaştıkça zorlaşır — sonraki basamak normal Avustralya barfiksi.",
  },
};
