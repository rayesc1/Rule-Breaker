#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

// ── Seeded RNG ────────────────────────────────────────────────────
function makePrng(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function pickN(arr, n, rng) { return shuffle(arr, rng).slice(0, n); }

// ── Word sets ─────────────────────────────────────────────────────
const SILENT_SET = new Set([
  'KNIGHT','KNIFE','WRAP','GNOME','LAMB','THUMB','CLIMB','GHOST','SWORD','KNOT',
  'WRECK','GNAT','WRIST','KNEEL','KNOCK','DUMB','COMB','NUMB','DEBT','DOUBT',
  'WREN','WRITE','PSALM','CASTLE','FASTEN','LISTEN','SOFTEN','WHISTLE','NESTLE',
  'BUSTLE','WRESTLE','THISTLE','BALLET','BUFFET','BOUQUET','DEPOT','DEBUT',
  'MUSCLE','HUSTLE','ISLAND','AISLE','CALM','PALM','WALK','TALK','CHALK','HALF',
  'CALF','WOULD','COULD','SHOULD','FOLK','YOLK','SALMON','BALM','HOUR','HONEST',
  'HONOR','PLUMB','KNAVE','KNACK','RHYME','RHINO','TOMB','WOMB','BOMB','GNASH',
  'KNEW','KNIT','KNOLL','WREATH','WRONG','WROTE','WRING','WRENCH','GNAW','GNARL',
  'LIMB','CRUMB','HYMN','COLUMN','AUTUMN','SOLEMN','DAMN','CONDEMN','HASTEN',
]);

const CATEGORY_POOL = {
  animal:     ['TIGER','WOLF','HAWK','COBRA','FINCH','SHARK','CRANE','HERON','BISON','RAVEN','CROW','DEER','OTTER','FALCON','FROG','ROBIN','PARROT','JAGUAR','COYOTE','GAZELLE','WALRUS','DOLPHIN','BASS','NEWT','LARK','MOLE','MOTH','WASP','VIPER','LYNX','GECKO','BADGER','PANDA','MOOSE','SWIFT','QUAIL','MARTEN','WEASEL','FERRET','SHREW','LEMUR','GIBBON','JACKAL','BOBCAT','COUGAR','TROUT','SALMON','BEETLE','SPIDER','TOAD','STORK','IBIS','GROUSE','TOUCAN','MAGPIE','CONDOR','OSPREY','KESTREL','VOLE','BABOON','CHEETAH','HYENA','GORILLA','BUFFALO','IMPALA','CARIBOU','NARWHAL','ORCA','MINNOW','PIKE','SNIPE','PLOVER','DINGO','TAPIR','LLAMA','ALPACA','STOAT','PIGEON','SPARROW','THRUSH','WARBLER','LINNET','BUNTING','CURLEW','AVOCET','BITTERN','KITE','BUZZARD','HARRIER','GOSHAWK','MARTIN','SWALLOW','SKYLARK','WHEATEAR','REDSTART','WAXWING'],
  color:      ['SCARLET','CRIMSON','AMBER','TEAL','INDIGO','VIOLET','MAROON','CORAL','COBALT','AZURE','JADE','EBONY','MAUVE','LILAC','PLUM','RUBY','COPPER','CYAN','MAGENTA','LAVENDER','FUCHSIA','SAFFRON','MUSTARD','KHAKI','TAUPE','SIENNA','OCHRE','VERMILION','GOLD','SILVER','BRONZE','CREAM','IVORY','OLIVE','ROSE','PERIWINKLE','CHARTREUSE','CERISE','TANGERINE','BUFF','FAWN','ECRU','UMBER','CARMINE','TURQUOISE','AQUAMARINE','CERULEAN','SEPIA','RUSSET','CLARET','DAMSON','AUBURN','CHESTNUT','HAZEL','FLAXEN','TAWNY','SLATE','PEWTER','GUNMETAL','CHARCOAL','ONYX','ALABASTER','LINEN','SAND','BISQUE','PEACH','APRICOT','SALMON','BLUSH','PUCE'],
  sport:      ['TENNIS','SOCCER','RUGBY','CRICKET','HOCKEY','BOXING','SKIING','SURFING','ROWING','CYCLING','SWIMMING','DIVING','ARCHERY','FENCING','WRESTLING','JUDO','GOLF','POLO','SQUASH','BADMINTON','VOLLEYBALL','BASKETBALL','BASEBALL','HANDBALL','CROQUET','DARTS','SNOOKER','CURLING','MARATHON','HURDLES','JAVELIN','DISCUS','TRIATHLON','BIATHLON','PENTATHLON','LACROSSE','NETBALL','SOFTBALL','BOWLING','KARATE','TAEKWONDO','SUMO','ROWING','SAILING','CANOEING','CLIMBING','GYMNASTICS','WEIGHTLIFTING','SHOOTING','BOBSLED','LUGE','SKELETON','CROSSFIT','SKATEBOARDING','WAKEBOARDING'],
  vehicle:    ['TRUCK','TRAIN','PLANE','YACHT','CANOE','KAYAK','BARGE','FERRY','TRAM','ROCKET','SHUTTLE','GLIDER','SCOOTER','MOPED','BICYCLE','SEDAN','COUPE','WAGON','JEEP','GONDOLA','CATAMARAN','FRIGATE','SUBMARINE','HELICOPTER','BALLOON','MONORAIL','TROLLEY','TANKER','DINGHY','TUGBOAT','TRAWLER','BIPLANE','SLED','SNOWMOBILE','UNICYCLE','TRICYCLE','MOTORBIKE','CARAVAN','MINIBUS','COACH','AMBULANCE','BULLDOZER','EXCAVATOR','FORKLIFT','TRACTOR','HARVESTER','SNOWPLOW','STEAMBOAT','HOVERCRAFT','AIRSHIP','ZEPPELIN','SPACECRAFT','ROVER','FREIGHTER','DESTROYER','CRUISER','BATTLESHIP','CARRIER','PADDLEBOAT','LANDER','CAPSULE'],
  food:       ['MANGO','PEACH','PLUM','GRAPE','APPLE','LEMON','MELON','OLIVE','ONION','CARROT','CELERY','GINGER','GARLIC','PEPPER','TOMATO','POTATO','SPINACH','CABBAGE','TURNIP','RADISH','KALE','LEEK','BASIL','THYME','SAGE','MINT','ALMOND','WALNUT','PECAN','CASHEW','BARLEY','CHEESE','BUTTER','HONEY','PICKLE','CURRY','TACO','SALSA','HUMMUS','FALAFEL','KEBAB','PAPAYA','GUAVA','LYCHEE','KUMQUAT','PERSIMMON','POMELO','TANGERINE','NECTARINE','APRICOT','CHERRY','BLUEBERRY','RASPBERRY','STRAWBERRY','BLACKBERRY','CRANBERRY','GOOSEBERRY','ELDERBERRY','MULBERRY','QUINCE','FENNEL','ARTICHOKE','ASPARAGUS','BROCCOLI','CAULIFLOWER','COURGETTE','AUBERGINE','AVOCADO','BEETROOT','PARSNIP','SWEDE','CELERIAC','KOHLRABI','OKRA','SORREL','WATERCRESS','RADICCHIO','SAMPHIRE','TAMARIND','JICAMA','CASSAVA','PLANTAIN','LOQUAT','CHERIMOYA'],
  instrument: ['GUITAR','VIOLIN','CELLO','FLUTE','OBOE','CLARINET','TRUMPET','TROMBONE','TUBA','BANJO','MANDOLIN','UKULELE','SITAR','LUTE','HARP','PIANO','ORGAN','ACCORDION','HARMONICA','KAZOO','XYLOPHONE','MARIMBA','CYMBAL','TAMBOURINE','BONGO','CONGA','SNARE','BASSOON','PICCOLO','SAXOPHONE','CORNET','BUGLE','RECORDER','BAGPIPE','DULCIMER','ZITHER','AUTOHARP','CITTERN','REBEC','ANGKLUNG','STEELPAN','MBIRA','BALAFON','KORA','DJEMBE','TABLA','SAROD','VEENA','SANTOOR','DUDUK','ERHU','GUZHENG','PIPA','DIZI','SHAMISEN','KOTO','SHAKUHACHI','BIWA'],
  weather:    ['STORM','FROST','SLEET','HAIL','SNOW','RAIN','DRIZZLE','FOG','MIST','CLOUD','THUNDER','TORNADO','CYCLONE','TYPHOON','HURRICANE','BLIZZARD','DROUGHT','FLOOD','GALE','SQUALL','GUST','BREEZE','MONSOON','TEMPEST','DOWNPOUR','SHOWER','FLURRY','ICICLE','RAINBOW','WHIRLWIND','SUNSHINE','LIGHTNING','OVERCAST','SMOG','HAZE','SLUSH','FREEZE','THAW','HEATWAVE','DAMP','HUMID','ARID','BALMY','BREEZY','CRISP','FOGGY','FROSTY','RAINY','SNOWY','STORMY','SUNNY','WINDY','MISTY','CLOUDY','WINTRY','SULTRY'],
  emotion:    ['GRIEF','BLISS','FURY','DREAD','ENVY','PRIDE','SHAME','GUILT','HOPE','LOVE','HATE','FEAR','RAGE','CALM','JOY','ANGST','GLOOM','CHEER','SCORN','PITY','AWE','SHOCK','PANIC','DOUBT','TRUST','DISGUST','DELIGHT','SORROW','ELATION','DESPAIR','CONTENT','SERENITY','LONGING','ANGUISH','ECSTASY','MELANCHOLY','EUPHORIA','NOSTALGIA','YEARNING','REMORSE','REGRET','RELIEF','GRATITUDE','EMPATHY','SYMPATHY','JEALOUSY','BITTERNESS','RESENTMENT','CONTEMPT','LOATHING','TERROR','HORROR','ALARM','DISMAY','DISTRESS','AGONY','MISERY','FORLORN','DEJECTED','GLOOMY','GLUM','MOROSE','MOURNFUL','WISTFUL','PENSIVE','BROODING'],
  body:       ['THUMB','ELBOW','SPINE','SKULL','ANKLE','WRIST','CHEEK','BROW','CHIN','SCALP','PALM','CALF','SHIN','HEEL','LOBE','IRIS','PUPIL','NOSTRIL','TEMPLE','STERNUM','PELVIS','FEMUR','TIBIA','FIBULA','RADIUS','ULNA','HUMERUS','PATELLA','THORAX','LARYNX','TONSIL','TRACHEA','CORNEA','RETINA','JAWBONE','KNEECAP','RIBCAGE','COLLARBONE','HIPBONE','SHINBONE','THIGHBONE','BREASTBONE','BACKBONE','TAILBONE','CHEEKBONE','EARDRUM','EARLOBE','EYEBROW','EYELID','FOREHEAD','KNUCKLE','FINGERTIP','TOENAIL','THUMBNAIL','ARMPIT','NAVEL','INSTEP','SOLE','NAPE','THROAT','TORSO','SHOULDER','WAIST'],
  country:    ['FRANCE','BRAZIL','CHINA','INDIA','JAPAN','EGYPT','GHANA','ITALY','SPAIN','CHILE','PERU','CUBA','IRAN','IRAQ','OMAN','FIJI','LAOS','MALI','TOGO','CHAD','NIGER','BENIN','KENYA','NEPAL','QATAR','WALES','SUDAN','SYRIA','LIBYA','HAITI','NAURU','PALAU','TONGA','SAMOA','ARUBA','GREECE','TURKEY','RUSSIA','POLAND','SWEDEN','NORWAY','DENMARK','FINLAND','AUSTRIA','BELGIUM','IRELAND','PORTUGAL','HUNGARY','ROMANIA','UKRAINE','ISRAEL','JORDAN','KUWAIT','BAHRAIN','BHUTAN','MYANMAR','CAMBODIA','VIETNAM','THAILAND','MALAYSIA','SINGAPORE','INDONESIA','PHILIPPINES','TAIWAN','MONGOLIA','GEORGIA','ARMENIA','MOLDOVA','ALBANIA','SERBIA','CROATIA','SLOVENIA','ESTONIA','LATVIA','LITHUANIA','ICELAND','LUXEMBOURG','MALTA','CYPRUS','ANDORRA','MONACO','MALDIVES','SEYCHELLES','MAURITIUS','DJIBOUTI','ERITREA','SOMALIA','RWANDA','BURUNDI','MALAWI','ZAMBIA','ZIMBABWE','BOTSWANA','NAMIBIA','ANGOLA','GABON','CAMEROON','SENEGAL','GUINEA','LIBERIA'],
  planet:     ['MERCURY','VENUS','EARTH','MARS','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','CERES','ERIS','HAUMEA','MAKEMAKE'],
  number:     ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN','SEVENTEEN','EIGHTEEN','NINETEEN','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY','HUNDRED','THOUSAND','MILLION','BILLION'],
  tree:       ['OAK','MAPLE','CEDAR','BIRCH','WILLOW','PINE','ASH','ELM','WALNUT','CHERRY','SPRUCE','FIR','YEW','BEECH','ALDER','ASPEN','HAZEL','HOLLY','LIME','HAWTHORN','ROWAN','ELDER','POPLAR','SYCAMORE','CHESTNUT','LAUREL','MAGNOLIA','CYPRESS','REDWOOD','SEQUOIA','BAMBOO','BAOBAB','BANYAN','EBONY','MAHOGANY','TEAK','BALSA','ACACIA','EUCALYPTUS','JACARANDA','MIMOSA','MULBERRY','MYRTLE','OLIVE','PALM','PAPAYA','PECAN','PLUM','LARCH','JUNIPER'],
  gemstone:   ['RUBY','SAPPHIRE','EMERALD','DIAMOND','OPAL','TOPAZ','GARNET','AMBER','PEARL','JADE','ONYX','QUARTZ','AMETHYST','CITRINE','PERIDOT','TURQUOISE','AQUAMARINE','BERYL','JASPER','AGATE','OBSIDIAN','SPINEL','ZIRCON','CORAL','IVORY','LAPIS','MALACHITE','MOONSTONE','SUNSTONE','TOURMALINE','TANZANITE','ALEXANDRITE','CHRYSOPRASE','RHODONITE','SODALITE','AVENTURINE','CARNELIAN','CHALCEDONY'],
  mythical:   ['DRAGON','PHOENIX','UNICORN','GRIFFIN','KRAKEN','SPHINX','CENTAUR','CYCLOPS','MEDUSA','HARPY','MINOTAUR','CHIMERA','HYDRA','PEGASUS','BASILISK','MANTICORE','WEREWOLF','VAMPIRE','MERMAID','SIREN','BANSHEE','GOLEM','DJINN','GNOME','FAIRY','PIXIE','SPRITE','NYMPH','SATYR','TITAN','GORGON','LEVIATHAN','RUSALKA','SELKIE','KELPIE','WENDIGO','THUNDERBIRD','QUETZAL'],
  occupation: ['DOCTOR','LAWYER','PILOT','CHEF','NURSE','JUDGE','BAKER','MINER','WELDER','TAILOR','FARMER','FISHER','HUNTER','ARCHER','SAILOR','TRADER','WRITER','ARTIST','SINGER','DANCER','ACTOR','COACH','GUARD','DRIVER','PORTER','RANGER','WARDEN','HERALD','HERALD','SCRIBE','MASON','SMITH','COOPER','TANNER','WEAVER','MILLER','BREWER','POTTER','CARVER','GLAZIER','BARBER','BUTCHER','COBBLER','FARRIER','FLETCHER','THATCHER','CHANDLER','VINTNER','APOTHECARY'],
  genre:      ['JAZZ','BLUES','SOUL','FUNK','PUNK','METAL','OPERA','DISCO','REGGAE','GOSPEL','TANGO','SALSA','SAMBA','WALTZ','POLKA','SWING','BEBOP','GRUNGE','TECHNO','HOUSE','TRANCE','AMBIENT','FOLK','COUNTRY','CLASSICAL','BAROQUE','ROMANTIC','MOTOWN','RAGTIME','BLUEGRASS','ROCKABILLY','FLAMENCO','BOSSA','CUMBIA','MERENGUE','CALYPSO','ZYDECO','AFROBEAT','QAWWALI'],
  currency:   ['DOLLAR','EURO','POUND','YEN','FRANC','PESO','RUBLE','RUPEE','KRONA','DINAR','DIRHAM','SHEKEL','FORINT','ZLOTY','KRONE','BAHT','RINGGIT','DONG','TAKA','KYAT','RIYAL','LIRA','WON','YUAN','RAND','NAIRA','CEDIS','BIRR','SHILLING','PIASTRE','FLORIN','GUILDER','DUCAT','GROAT','DENAR','LEVA','MANAT','TENGE'],
};
const CATEGORY_MAP = {};
Object.entries(CATEGORY_POOL).forEach(([cat, words]) => words.forEach(w => { CATEGORY_MAP[w] = cat; }));

// General word pool for computational rules
const GENERAL_WORDS = [
  'ARCH','BARN','DARK','FARM','GLOW','HELM','JEST','KITE','LOFT','NORM','RAFT',
  'SALT','VALE','WAND','BIRD','DRUM','GUST','HULL','LURE','PYRE','RUST','TUFT',
  'VEST','YARN','ZONE','BROW','CREW','DUSK','GRIM','HINT','JOLT','KELP','MUSE',
  'NOOK','BARD','HOWL','JINX','LURK','RUSE','SULK','URGE','VAST','WILT','YELP',
  'ZEAL','CRAG','DEFT','FLAX','GLIB','HUSK','KNOB','LILT','MOOT','OPAL','PIXY',
  'BLAND','BLEND','BRICK','CHARM','CHEST','CLAMP','CRAFT','CRANK','CREST','DRAWL',
  'DRIFT','DRILL','FLASK','FLEET','FLESH','FLOCK','FORGE','FRANK','FRESH','GLARE',
  'GLINT','GLOOM','GRASP','GRAZE','GREED','GRIND','GROAN','GROVE','GROWL','GRUNT',
  'HASTE','HEART','HOARD','HOIST','LATCH','LODGE','MARCH','MATCH','MERIT','MIRTH',
  'MOIST','MORAL','MULCH','NOBLE','NOTCH','PATCH','PEARL','PERCH','PHASE','PILOT',
  'PINCH','PIVOT','PLANK','PLEAT','PLUCK','PLUME','PLUSH','PORCH','POUND','PRANK',
  'PRESS','PRIME','PRISM','PROOF','PROWL','PRUNE','PUNCH','PURGE','QUEST','QUIRK',
  'RANCH','RAPID','REACH','REALM','REBEL','ROUGH','SALVO','SCALD','SCANT','SCARF',
  'SCENT','SCOUT','SCOWL','SCRAP','SHAFT','SHAKE','SHAME','SHARP','SHAWL','SHIFT',
  'SHOCK','SHORE','SHORT','SHOUT','SHOVE','SHRUG','SKIMP','SLANT','SLASH','SLEEK',
  'SLICK','SLIDE','SLING','SLOPE','SLUMP','SMASH','SMEAR','SMILE','SMIRK','SMOKE',
  'SNARE','SNARL','SNEAK','SNIFF','SNORE','SNORT','SPARE','SPARK','SPAWN','SPECK',
  'SPELL','SPEND','SPILL','SPINE','SPITE','SPLIT','SPORT','SPRAY','STACK','STAIN',
  'STALE','STALK','STALL','STAMP','STARE','STARK','STEAL','STEEP','STEER','STERN',
  'STICK','STIFF','STING','STOMP','STONE','STRAP','STRAW','STRAY','STRIP','STRUT',
  'STUMP','STUNT','STYLE','SURGE','SWAMP','SWARM','SWEAR','SWEAT','SWEEP','SWING',
  'SWIRL','SWOOP','THORN','TOUCH','TOUGH','TRACE','TRACK','TRAIL','TRASH','TRAWL',
  'TREAD','TREND','TRICK','TRILL','TROOP','TROVE','TRUCK','TRYST','TWIST','VOUCH',
  'WRATH','WRECK','YAWNS','PLAID','CLAIM','CLOAK','CRAWL','CREEK','CROWN','CRUMB',
  'CRUSH','CRUST','DRAPE','DREAD','DRINK','DROOL','DROOP','FLAIR','FLAME','FLANK',
  'FLAP','FLASH','FLECK','FLEET','FLING','FLINT','FLOAT','FLOCK','FLOOD','FLOOR',
  'FLOSS','FRAIL','FRAME','FRAUD','FREAK','FREED','FROND','FROST','FROZE','FROWN',
  'BRAID','BRAIN','BRAKE','BRAND','BRAVE','BRAWL','BRAWN','BRAZE','BROIL','BROKE',
  'BROOD','BROOK','BROTH','BROWN','CLACK','CLAMP','CLANG','CLANK','CLASH','CLASP',
  'CLASS','CAULK','GRUFF','PLUMB','SCAMP','SCALP','SCRAM','SCRUB','SHEEN','SHOAL',
  'SLEET','SLEUTH','SLICK','SLINK','SMOCK','SMUDGE','SNACK','SNAIL','SNOOP','SPIRE',
  'STACK','STAND','STARK','STARVE','STOMP','STOUT','STRIFE','SWATH','THATCH','THICK',
  'THORN','THROB','THROW','THRUM','THUD','THUMB','THUMP','TINGE','TIPSY','TORCH',
  'TOXIC','TRACE','TRAMP','TRAWL','TRUCE','TRUMP','TRUNK','TRUSS','TUBER','TULIP',
  'VAULT','VIGOR','VISOR','VOGUE','VOUCH','WHELP','WHIFF','WHIRL','WHISK','WRATH',
  'CLEFT','CLUNK','CRIMP','CRINGE','CROAK','DANGLE','DAUNT','DELVE','DENSE','DEPOT',
  'CRYPT','CURED','CUTCH','DEPTH','DERBY','DERBY','DINGO','DISCO','DITCH','DJINN',
  'DRIFT','DWARF','DYING','EJECT','EMERY','EPOCH','EVOKE','EXERT','EXTOL','EXULT',
  'FABLE','FACET','FAKER','FANCY','FARCE','FATWA','FAULT','FEAST','FENDS','FETID',
  'FIEND','FILCH','FINCH','FJORD','FLECK','FLESH','FLOAT','FLOSS','FLOUT','FORAY',
  'FRISK','FROTH','FROZE','FUNGI','GAMUT','GAUZE','GAVEL','GAWKY','GELID','GERMS',
  'GHOUL','GILDS','GIMPS','GIRDS','GLADS','GLAIR','GLEAN','GLENS','GLIDE','GLOAT',
  'GLOSS','GLUTS','GLYPH','GNASH','GNOME','GOADS','GOLEM','GOUGE','GRABS','GRAFT',
  'GRAIL','GRIPE','GROAN','GROIN','GROUP','GROUT','GUILD','GUILE','GUISE','GULCH',
  'SWUNG','SYNOD','TABBY','TAINT','TALON','TANGO','TAUNT','TAWNY','TEPID','TERSE',
  'THORN','SHUNT','SCULPT','SCUFF','SCRIP','SCROD','SCHWA','SAUCE','SAVOR','SNIDE',
  'STOIC','STOKE','STOMP','STONY','SNOUT','SNOWY','SMELT','SMOCK','SMOTE','SLEEK',
  'BRISK','BROOCH','GRUEL','GRIEVOUS','PLEAT','PLUMB','GRUBS','GUILT','GUSTO','INEPT',
  'INKBLOT','INSET','INTER','INTRO','IRATE','ISLET','JOUST','KNAVE','KNEEL','KNELT',
];

// ── Single-word rule definitions ──────────────────────────────────
const SINGLE_RULES = [
  {
    id: 'S01', label: 'Has more consonants than vowels',
    check: w => { const v = (w.match(/[AEIOU]/g)||[]).length; return (w.length-v)>v; },
  },
  {
    id: 'S02', label: 'Has more vowels than consonants',
    check: w => { const v = (w.match(/[AEIOU]/g)||[]).length; return v>(w.length-v); },
  },
  {
    id: 'S03', label: 'Starts and ends with the same letter',
    check: w => w.length>1 && w[0]===w[w.length-1],
  },
  {
    id: 'S04', label: 'Contains no repeated letters',
    check: w => new Set(w).size===w.length,
  },
  {
    id: 'S05', label: 'Contains a silent letter',
    check: w => SILENT_SET.has(w),
  },
  {
    id: 'S06', label: 'All vowels in the word are the same',
    check: w => { const v=w.match(/[AEIOU]/g); return !!(v&&v.length>0&&new Set(v).size===1); },
  },
  {
    id: 'S07', label: 'Is exactly 4 letters long',
    check: w => w.length===4,
  },
  {
    id: 'S08', label: 'Is exactly 5 letters long',
    check: w => w.length===5,
  },
  {
    id: 'S09', label: 'Is exactly 6 letters long',
    check: w => w.length===6,
  },
  {
    id: 'S10', label: 'Is more than 6 letters long',
    check: w => w.length>6,
  },
  {
    id: 'S11', label: 'Contains a double letter',
    check: w => /(.)\1/.test(w),
  },
  {
    id: 'S13', label: 'All letters are in the first half of the alphabet',
    check: w => [...w].every(c => c>='A'&&c<='M'),
  },
  {
    id: 'S14', label: 'Is a palindrome',
    check: w => w.length>1 && w===w.split('').reverse().join(''),
  },
  {
    id: 'S15', label: 'Is a living thing',
    check: w => CATEGORY_MAP[w]==='animal',
  },
  {
    id: 'S16', label: 'Is a color',
    check: w => CATEGORY_MAP[w]==='color',
  },
  {
    id: 'S17', label: 'Is a sport',
    check: w => CATEGORY_MAP[w]==='sport',
  },
  {
    id: 'S18', label: 'Is a vehicle',
    check: w => CATEGORY_MAP[w]==='vehicle',
  },
  {
    id: 'S19', label: 'Is a food or ingredient',
    check: w => CATEGORY_MAP[w]==='food',
  },
  {
    id: 'S20', label: 'Is a musical instrument',
    check: w => CATEGORY_MAP[w]==='instrument',
  },
  {
    id: 'S21', label: 'Is a weather word',
    check: w => CATEGORY_MAP[w]==='weather',
  },
  {
    id: 'S22', label: 'Is an emotion',
    check: w => CATEGORY_MAP[w]==='emotion',
  },
  {
    id: 'S23', label: 'Is a body part',
    check: w => CATEGORY_MAP[w]==='body',
  },
  {
    id: 'S24', label: 'Starts with a vowel',
    check: w => /^[AEIOU]/.test(w),
  },
  {
    id: 'S25', label: 'Ends with a vowel',
    check: w => /[AEIOU]$/.test(w),
  },
  {
    id: 'S26', label: 'Contains the letter S',
    check: w => w.includes('S'),
  },
  {
    id: 'S27', label: 'Contains the letter R',
    check: w => w.includes('R'),
  },
  {
    id: 'S28', label: 'Contains exactly 3 vowels',
    check: w => (w.match(/[AEIOU]/g)||[]).length===3,
  },
  {
    id: 'S29', label: 'Is a country',
    check: w => CATEGORY_MAP[w]==='country',
  },
  {
    id: 'S30', label: 'Is a planet',
    check: w => CATEGORY_MAP[w]==='planet',
  },
  {
    id: 'S31', label: 'Letters are in alphabetical order',
    check: w => { const a=[...w]; return a.every((c,i)=>i===0||c>=a[i-1]); },
  },
  {
    id: 'S32', label: 'Is a number word',
    check: w => CATEGORY_MAP[w]==='number',
  },
  {
    id: 'S33', label: 'Contains the letter T',
    check: w => w.includes('T'),
  },
  {
    id: 'S34', label: 'Contains the letter N',
    check: w => w.includes('N'),
  },
  {
    id: 'S35', label: 'Is a tree',
    check: w => CATEGORY_MAP[w]==='tree',
  },
  {
    id: 'S36', label: 'Is a gemstone',
    check: w => CATEGORY_MAP[w]==='gemstone',
  },
  {
    id: 'S37', label: 'Is a mythical creature',
    check: w => CATEGORY_MAP[w]==='mythical',
  },
  {
    id: 'S38', label: 'Is an occupation',
    check: w => CATEGORY_MAP[w]==='occupation',
  },
  {
    id: 'S39', label: 'Is a music genre',
    check: w => CATEGORY_MAP[w]==='genre',
  },
  {
    id: 'S40', label: 'Is a currency',
    check: w => CATEGORY_MAP[w]==='currency',
  },
];

// ── Pair rule definitions ─────────────────────────────────────────
const PAIR_RULES = [
  {
    id: 'P01', label: 'Both words start with the same letter',
    check: (l,r) => l[0]===r[0],
  },
  {
    id: 'P02', label: 'Both words end with the same letter',
    check: (l,r) => l[l.length-1]===r[r.length-1],
  },
  {
    id: 'P03', label: 'Both words belong to the same category',
    check: (l,r) => { const cl=CATEGORY_MAP[l],cr=CATEGORY_MAP[r]; return !!(cl&&cr&&cl===cr); },
  },
  {
    id: 'P04', label: 'Both words are the same length',
    check: (l,r) => l.length===r.length,
  },
  {
    id: 'P05', label: 'Both words contain a double letter',
    check: (l,r) => /(.)\1/.test(l) && /(.)\1/.test(r),
  },
  {
    id: 'P06', label: 'Combined letter count is more than 10',
    check: (l,r) => (l.length+r.length)>10,
  },
  {
    id: 'P07', label: 'Both words have more than 5 letters',
    check: (l,r) => l.length>5 && r.length>5,
  },
  {
    id: 'P08', label: 'Both words start with a consonant',
    check: (l,r) => !/^[AEIOU]/.test(l) && !/^[AEIOU]/.test(r),
  },
  {
    id: 'P09', label: 'Both words are animals',
    check: (l,r) => CATEGORY_MAP[l]==='animal' && CATEGORY_MAP[r]==='animal',
  },
  {
    id: 'P10', label: 'Both words are colors',
    check: (l,r) => CATEGORY_MAP[l]==='color' && CATEGORY_MAP[r]==='color',
  },
  {
    id: 'P11', label: 'Both words end with a vowel',
    check: (l,r) => /[AEIOU]$/.test(l) && /[AEIOU]$/.test(r),
  },
  {
    id: 'P12', label: 'Both words have the same number of vowels',
    check: (l,r) => (l.match(/[AEIOU]/g)||[]).length===(r.match(/[AEIOU]/g)||[]).length,
  },
];

// ═══════════════════════════════════════════════════════════════════
// Word pool builders — return arrays of words matching a rule
// ═══════════════════════════════════════════════════════════════════
function getPoolForRule(rule) {
  // Semantic/lookup rules: use specific category pool
  const catMap = {
    'S15': 'animal', 'S16': 'color', 'S17': 'sport',
    'S18': 'vehicle', 'S19': 'food', 'S20': 'instrument',
    'S21': 'weather', 'S22': 'emotion', 'S23': 'body',
    'S29': 'country', 'S30': 'planet', 'S32': 'number',
    'S35': 'tree', 'S36': 'gemstone', 'S37': 'mythical',
    'S38': 'occupation', 'S39': 'genre', 'S40': 'currency',
  };
  if (catMap[rule.id]) {
    return CATEGORY_POOL[catMap[rule.id]];
  }
  if (rule.id === 'S05') return [...SILENT_SET];
  if (rule.id === 'S14') {
    // Palindromes — curated list
    return ['KAYAK','RADAR','LEVEL','CIVIC','MADAM','REFER','ROTOR','TENET',
            'NOON','DEED','POOP','PEEP','SEES','RACECAR','STATS','REVIVER'];
  }
  // Computational rules: use combined pool of all words
  const allWords = [...new Set([
    ...GENERAL_WORDS,
    ...Object.values(CATEGORY_POOL).flat(),
    ...[...SILENT_SET],
  ])];

  // Y-ambiguous exclusion: for vowel-counting rules, exclude any word containing Y
  // so the rule is always unambiguous for players (Y-as-vowel debate never arises)
  if (VOWEL_RULE_IDS.has(rule.id)) {
    return allWords.filter(w => !w.includes('Y'));
  }

  return allWords;
}

// Helper: vowel rules exclude Y-containing words from all pools
const VOWEL_RULE_IDS = new Set(['S01','S02','S06','S24','S25','S28']);
function noYFilter(rule, words) {
  return VOWEL_RULE_IDS.has(rule.id) ? words.filter(w => !w.includes('Y')) : words;
}

// ── Build a balanced word list for a single-word rule phase ───────
// Returns array of { word, shouldAccept } with ~50/50 true/false mix
function buildSinglePhase(rule, count, rng, usedWords) {
  const pool = getPoolForRule(rule);
  const truePool  = pool.filter(w => rule.check(w) && !usedWords.has(w));
  const falsePool = pool.filter(w => !rule.check(w) && !usedWords.has(w));

  // For false words, pull from a broad pool so we don't use category words
  const broadFalse = noYFilter(rule, [...new Set([...GENERAL_WORDS, ...Object.values(CATEGORY_POOL).flat()])])
    .filter(w => !rule.check(w) && !usedWords.has(w));

  const half = Math.floor(count / 2);
  const trueCount  = half;
  const falseCount = count - half;

  const trueWords  = pickN(truePool, trueCount, rng);
  const falseWords = pickN(falsePool.length >= falseCount ? falsePool : broadFalse, falseCount, rng);

  if (trueWords.length < trueCount || falseWords.length < falseCount) {
    return null; // Not enough words — caller will retry with different rule
  }

  trueWords.forEach(w => usedWords.add(w));
  falseWords.forEach(w => usedWords.add(w));

  const items = [
    ...trueWords.map(w => ({ word: w, shouldAccept: true })),
    ...falseWords.map(w => ({ word: w, shouldAccept: false })),
  ];
  return shuffle(items, rng);
}

// ── Build a balanced pair list for a pair rule phase ──────────────
function buildPairPhase(rule, count, rng, usedWords) {
  const half = Math.floor(count / 2);
  const trueCount  = half;
  const falseCount = count - half;

  let truePairs  = [];
  let falsePairs = [];
  const allCatWords = Object.values(CATEGORY_POOL).flat();
  // For rules requiring specific categories (P09=animal, P10=color), use that pool
  const pairCatMap = { 'P09': 'animal', 'P10': 'color' };
  const pairCat = pairCatMap[rule.id];
  const allWords = pairCat
    ? CATEGORY_POOL[pairCat]
    : [...new Set([...GENERAL_WORDS, ...allCatWords, ...[...SILENT_SET]])];

  // Build true pairs
  let attempts = 0;
  while (truePairs.length < trueCount && attempts < 5000) {
    attempts++;
    const l = pick(allWords, rng);
    const r = pick(allWords, rng);
    if (l === r) continue;
    if (usedWords.has(l) || usedWords.has(r)) continue;
    if (usedWords.has(l+'+'+r) || usedWords.has(r+'+'+l)) continue;
    if (!rule.check(l, r)) continue;
    truePairs.push({ left: l, right: r, shouldAccept: true });
    usedWords.add(l); usedWords.add(r); usedWords.add(l+'+'+r);
  }

  // Build false pairs
  attempts = 0;
  while (falsePairs.length < falseCount && attempts < 5000) {
    attempts++;
    const l = pick(allWords, rng);
    const r = pick(allWords, rng);
    if (l === r) continue;
    if (usedWords.has(l) || usedWords.has(r)) continue;
    if (usedWords.has(l+'+'+r) || usedWords.has(r+'+'+l)) continue;
    if (rule.check(l, r)) continue;
    falsePairs.push({ left: l, right: r, shouldAccept: false });
    usedWords.add(l); usedWords.add(r); usedWords.add(l+'+'+r);
  }

  if (truePairs.length < trueCount || falsePairs.length < falseCount) return null;

  return shuffle([...truePairs, ...falsePairs], rng);
}

// ── Build mixed phase (singles + pairs) ──────────────────────────
function buildMixedPhase(rule, count, rng, usedWords) {
  // ~half pairs, half singles
  const pairCount   = Math.floor(count / 2);
  const singleCount = count - pairCount;
  const half = Math.floor(singleCount / 2);

  const pool = getPoolForRule(rule);
  const truePool  = pool.filter(w => rule.check(w) && !usedWords.has(w));
  const broadFalse = noYFilter(rule, [...new Set([...GENERAL_WORDS, ...Object.values(CATEGORY_POOL).flat()])])
    .filter(w => !rule.check(w) && !usedWords.has(w));
  const falsePool = pool.filter(w => !rule.check(w) && !usedWords.has(w));
  const combinedFalse = [...new Set([...falsePool, ...broadFalse])].filter(w => !usedWords.has(w));

  const trueWords  = pickN(truePool, half, rng);
  const falseWords = pickN(combinedFalse, singleCount - half, rng);
  if (trueWords.length < half || falseWords.length < singleCount - half) return null;

  trueWords.forEach(w => usedWords.add(w));
  falseWords.forEach(w => usedWords.add(w));

  const singleItems = shuffle([
    ...trueWords.map(w => ({ format: 'single', word: w, shouldAccept: true })),
    ...falseWords.map(w => ({ format: 'single', word: w, shouldAccept: false })),
  ], rng);

  // Build pairs — R3 uses single-word rules, so BOTH words must satisfy the rule for true pairs
  const allWords = noYFilter(rule, [...new Set([...GENERAL_WORDS, ...Object.values(CATEGORY_POOL).flat()])]);
  const halfP = Math.floor(pairCount / 2);
  let truePairs = [], falsePairs = [];
  let att = 0;
  while (truePairs.length < halfP && att < 3000) {
    att++;
    const l = pick(allWords, rng), r = pick(allWords, rng);
    if (l===r) continue;
    if (usedWords.has(l) || usedWords.has(r) || usedWords.has(l+'+'+r)) continue;
    if (!rule.check(l) || !rule.check(r)) continue;
    truePairs.push({ format: 'pair', left: l, right: r, shouldAccept: true });
    usedWords.add(l); usedWords.add(r); usedWords.add(l+'+'+r);
  }
  att = 0;
  while (falsePairs.length < pairCount - halfP && att < 3000) {
    att++;
    const l = pick(allWords, rng), r = pick(allWords, rng);
    if (l===r) continue;
    if (usedWords.has(l) || usedWords.has(r) || usedWords.has(l+'+'+r)) continue;
    if (rule.check(l) && rule.check(r)) continue;
    falsePairs.push({ format: 'pair', left: l, right: r, shouldAccept: false });
    usedWords.add(l); usedWords.add(r); usedWords.add(l+'+'+r);
  }
  if (truePairs.length < halfP || falsePairs.length < pairCount - halfP) return null;

  const pairItems = shuffle([...truePairs, ...falsePairs], rng);
  return shuffle([...singleItems, ...pairItems], rng);
}

// ═══════════════════════════════════════════════════════════════════
// Puzzle builder — one day at a time
// ═══════════════════════════════════════════════════════════════════
const LAUNCH_UTC = Date.UTC(2026, 2, 13);

function utcDateString(dayNumber) {
  const ms = LAUNCH_UTC + (dayNumber - 1) * 86400000;
  const d  = new Date(ms);
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
}

function pickDistinctRules(rng, recentRules) {
  // Need 9 distinct rules: 2 for R1 (single), 3 for R2 (pair), 4 for R3 (single)
  // R2 rules must be pair rules; R1/R3 rules must be single rules
  // No rule label can repeat across the whole puzzle
  // recentRules: Set of rule labels used in the previous day — excluded here

  const recent = recentRules || new Set();
  const availSingle = SINGLE_RULES.filter(r => !recent.has(r.label));
  const availPair   = PAIR_RULES.filter(r => !recent.has(r.label));

  // Fall back to full list if filtering leaves too few rules
  const shuffledSingle = shuffle(availSingle.length >= 6 ? availSingle : SINGLE_RULES, rng);
  const shuffledPair   = shuffle(availPair.length >= 3   ? availPair   : PAIR_RULES,   rng);

  const r1Rules  = shuffledSingle.slice(0, 2);  // 2 single rules for Round 1
  const r2Rules  = shuffledPair.slice(0, 3);    // 3 pair rules for Round 2
  const r3Rules  = shuffledSingle.slice(2, 6);  // 4 single rules for Round 3

  return { r1Rules, r2Rules, r3Rules };
}

function buildPuzzle(dayNumber, recentWords, recentRules) {
  // Use a generation seed distinct from the player shuffle seed
  const rng = makePrng(dayNumber * 31337 + 99991);
  let attempts = 0;

  while (attempts < 30) {
    attempts++;
    const rngLocal = makePrng(dayNumber * 31337 + 99991 + attempts * 7);
    // Seed usedLocal with recent words so they won't be reused
    const usedLocal = new Set(recentWords || []);
    const { r1Rules, r2Rules, r3Rules } = pickDistinctRules(rngLocal, recentRules);

    // ── Round 1: 30 singles, 2 rules, inversion at 15 ──────────
    const r1p0 = buildSinglePhase(r1Rules[0], 15, rngLocal, usedLocal);
    if (!r1p0) continue;
    const r1p1 = buildSinglePhase(r1Rules[1], 15, rngLocal, usedLocal);
    if (!r1p1) continue;

    // ── Round 2: 30 pairs, 3 rules, inversions at 10,20 ────────
    const r2p0 = buildPairPhase(r2Rules[0], 10, rngLocal, usedLocal);
    if (!r2p0) continue;
    const r2p1 = buildPairPhase(r2Rules[1], 10, rngLocal, usedLocal);
    if (!r2p1) continue;
    const r2p2 = buildPairPhase(r2Rules[2], 10, rngLocal, usedLocal);
    if (!r2p2) continue;

    // ── Round 3: 40 mixed, 4 rules, inversions at 10,20,30 ─────
    const r3p0 = buildMixedPhase(r3Rules[0], 10, rngLocal, usedLocal);
    if (!r3p0) continue;
    const r3p1 = buildMixedPhase(r3Rules[1], 10, rngLocal, usedLocal);
    if (!r3p1) continue;
    const r3p2 = buildMixedPhase(r3Rules[2], 10, rngLocal, usedLocal);
    if (!r3p2) continue;
    const r3p3 = buildMixedPhase(r3Rules[3], 10, rngLocal, usedLocal);
    if (!r3p3) continue;

    // ── All phases built — assemble ────────────────────────────
    return {
      day:    dayNumber,
      number: String(dayNumber).padStart(3, '0'),
      date:   utcDateString(dayNumber),
      rounds: [
        {
          id: 0, label: 'ROUND 1', name: 'The Switch',
          type: 'single', total: 30, inversionPoints: [15],
          rules: [r1Rules[0].label, r1Rules[1].label],
          words: [...r1p0, ...r1p1],
        },
        {
          id: 1, label: 'ROUND 2', name: 'Pairs',
          type: 'pairs', total: 30, inversionPoints: [10, 20],
          rules: [r2Rules[0].label, r2Rules[1].label, r2Rules[2].label],
          pairs: [...r2p0, ...r2p1, ...r2p2],
        },
        {
          id: 2, label: 'ROUND 3', name: 'Rule Breaker',
          type: 'mixed', total: 40, inversionPoints: [10, 20, 30],
          rules: [r3Rules[0].label, r3Rules[1].label, r3Rules[2].label, r3Rules[3].label],
          items: [...r3p0, ...r3p1, ...r3p2, ...r3p3],
        },
      ],
    };
  }
  throw new Error(`Failed to build puzzle for day ${dayNumber} after ${attempts} attempts`);
}

// ── Validation ────────────────────────────────────────────────────
function validatePuzzle(puzzle) {
  const errors = [];
  const allSingleRuleMap = Object.fromEntries(SINGLE_RULES.map(r => [r.label, r.check]));
  const allPairRuleMap   = Object.fromEntries(PAIR_RULES.map(r => [r.label, r.check]));

  puzzle.rounds.forEach(rd => {
    let phase = 0;
    const items = rd.type === 'single' ? rd.words
                : rd.type === 'pairs'  ? rd.pairs
                : rd.items;

    items.forEach((item, i) => {
      if (rd.inversionPoints.includes(i)) phase++;
      const ruleLabel = rd.rules[phase];

      if (rd.type === 'single' || (rd.type === 'mixed' && item.format === 'single')) {
        const checker = allSingleRuleMap[ruleLabel];
        if (!checker) { errors.push(`R${rd.id} i${i}: no checker for "${ruleLabel}"`); return; }
        const computed = checker(item.word);
        if (computed !== item.shouldAccept) {
          errors.push(`R${rd.id} i${i} "${item.word}" [${ruleLabel}]: computed=${computed} expected=${item.shouldAccept}`);
        }
      } else {
        // Pairs in Round 2 use pair rules. Pairs in Round 3 (mixed) use single rules —
        // both words must satisfy the rule for shouldAccept=true.
        const isPairRule = !!allPairRuleMap[ruleLabel];
        const checker = isPairRule ? allPairRuleMap[ruleLabel] : allSingleRuleMap[ruleLabel];
        if (!checker) { errors.push(`R${rd.id} i${i}: no checker for "${ruleLabel}"`); return; }
        let computed;
        if (isPairRule) {
          computed = checker(item.left, item.right);
        } else {
          // Single rule applied to a pair: both words must satisfy it
          computed = checker(item.left) && checker(item.right);
        }
        if (!!computed !== item.shouldAccept) {
          errors.push(`R${rd.id} i${i} "${item.left||item.word}/${item.right||''}" [${ruleLabel}]: computed=${computed} expected=${item.shouldAccept}`);
        }
      }
    });

    // Check totals
    if (items.length !== rd.total) {
      errors.push(`R${rd.id}: expected ${rd.total} items, got ${items.length}`);
    }
  });

  return errors;
}

// ═══════════════════════════════════════════════════════════════════
// Main — batch puzzle generation with persistent word memory
//
// Generates 30 days per batch. After each run, saves all words used
// to recently-used.json. The next batch reads that file and blocks
// those words for the first 30 days — guaranteeing true 30-day
// separation between batches.
//
// Usage:
//   node generate-puzzles.js            → generates next 30 days
//   node generate-puzzles.js --reset    → clears recently-used.json
// ═══════════════════════════════════════════════════════════════════
const BATCH_SIZE  = 30;
const WINDOW      = 30;
const recentPath  = path.join(__dirname, 'recently-used.json');
const puzzlesPath = path.join(__dirname, 'puzzles.json');

// Parse args
const resetMode = process.argv.includes('--reset');
if (resetMode) {
  if (fs.existsSync(recentPath)) fs.unlinkSync(recentPath);
  console.log('✓ recently-used.json cleared. Next run starts fresh.\n');
  process.exit(0);
}

// Load existing puzzles to find the last day generated
let existingPuzzles = {};
if (fs.existsSync(puzzlesPath)) {
  try { existingPuzzles = JSON.parse(fs.readFileSync(puzzlesPath)); } catch {}
}
const existingDays = Object.keys(existingPuzzles).map(Number).sort((a,b)=>a-b);
const lastDay      = existingDays.length > 0 ? existingDays[existingDays.length - 1] : 0;
const startDay     = lastDay + 1;
const endDay       = lastDay + BATCH_SIZE;

// Load per-day word history from previous batch into wordsByDay
// Rolling window naturally expires old words as the batch progresses
const puzzles   = {};
let totalErrors = 0;
const wordsByDay = {};

if (fs.existsSync(recentPath)) {
  try {
    const recentData = JSON.parse(fs.readFileSync(recentPath));
    if (Array.isArray(recentData)) {
      wordsByDay[startDay - 1] = new Set(recentData);
      console.log(`Loaded ${recentData.length} words from previous batch`);
    } else {
      Object.entries(recentData).forEach(([day, words]) => {
        wordsByDay[Number(day)] = new Set(words);
      });
      console.log(`Loaded ${Object.keys(recentData).length} days of word history from previous batch`);
    }
  } catch {}
}

console.log(`Generating Days ${startDay}–${endDay} (${BATCH_SIZE}-day batch)
`);

function extractWords(puzzle) {
  const words = new Set();
  puzzle.rounds.forEach(rd => {
    const items = rd.type === 'single' ? rd.words
                : rd.type === 'pairs'  ? rd.pairs
                : rd.items;
    items.forEach(item => {
      if (item.word)  words.add(item.word);
      if (item.left)  words.add(item.left);
      if (item.right) words.add(item.right);
    });
  });
  return words;
}

function extractRules(puzzle) {
  return new Set(puzzle.rounds.flatMap(rd => rd.rules));
}

// Track rules used per day so we can block them from the next day
const rulesByDay = {};

// Pre-populate rules from existing puzzles for cross-batch rule blocking
Object.entries(existingPuzzles).forEach(([day, puzzle]) => {
  rulesByDay[Number(day)] = extractRules(puzzle);
});

for (let day = startDay; day <= endDay; day++) {
  let puzzle;
  try {
    const windows = [WINDOW, 14, 7, 0];
    let built = false;
    // Rules used yesterday — blocked from today
    const prevDayRules = rulesByDay[day - 1] || new Set();
    for (const win of windows) {
      const windowWords = new Set();
      for (let d = day - win; d < day; d++) {
        if (wordsByDay[d]) wordsByDay[d].forEach(w => windowWords.add(w));
      }
      try {
        puzzle = buildPuzzle(day, windowWords, prevDayRules);
        if (win < WINDOW) console.log(`  Day ${day}: relaxed to ${win}-day window`);
        built = true;
        break;
      } catch {}
    }
    if (!built) throw new Error('all windows exhausted');
  } catch (e) {
    console.error(`Day ${day}: GENERATION FAILED — ${e.message}`);
    process.exit(1);
  }

  const errors = validatePuzzle(puzzle);
  if (errors.length > 0) {
    console.error(`Day ${day}: ${errors.length} validation errors:`);
    errors.forEach(e => console.error('  ' + e));
    totalErrors += errors.length;
  } else {
    console.log(`Day ${String(day).padStart(3,'0')} ✓  ${puzzle.date}`);
    puzzle.rounds.forEach(r => {
      console.log(`       R${r.id+1}: ${r.rules.join(' → ')}`);
    });
  }

  wordsByDay[day]  = extractWords(puzzle);
  rulesByDay[day]  = extractRules(puzzle);
  puzzles[day]     = puzzle;
}

if (totalErrors > 0) {
  console.error(`\n${totalErrors} total validation errors. Not writing output.`);
  process.exit(1);
}

// Merge with existing puzzles and write
const merged = { ...existingPuzzles, ...puzzles };
fs.writeFileSync(puzzlesPath, JSON.stringify(merged, null, 2));
console.log(`\n✓ puzzles.json updated — now contains Days 1–${endDay}`);

// Save per-day word sets so next batch can use rolling window across batch boundary
const recentData = {};
for (let day = startDay; day <= endDay; day++) {
  if (wordsByDay[day]) recentData[day] = [...wordsByDay[day]];
}
fs.writeFileSync(recentPath, JSON.stringify(recentData, null, 2));
const totalSaved = Object.values(recentData).reduce((a,b)=>a+b.length,0);
console.log(`✓ recently-used.json saved — ${endDay - startDay + 1} days of word history for next batch`);
console.log(`✓ ${BATCH_SIZE} puzzles, 0 errors`);
console.log(`\nNext run will generate Days ${endDay + 1}–${endDay + BATCH_SIZE}`);
