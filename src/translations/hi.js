export default {
  // Navigation
  nav: {
    home: 'होम',
    about: 'के बारे में',
    start: 'शुरू करें',
    language: 'भाषा'
  },
  
  // Common
  common: {
    name: 'नाम',
    location: 'स्थान',
    submit: 'जमा करें',
    cancel: 'रद्द करें',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफलता',
    required: 'आवश्यक'
  },
  
  // Form Page
  form: {
    title: 'साइट विवरण',
    subtitle: 'सटीक विश्लेषण के लिए अपनी संपत्ति की जानकारी प्रदान करें',
    name: 'नाम',
    namePlaceholder: 'अपना नाम दर्ज करें',
    location: 'स्थान',
    locationPlaceholder: 'अपने शहर का नाम टाइप करना शुरू करें...',
    roofArea: 'छत का क्षेत्र (m²)',
    roofAreaPlaceholder: 'छत का क्षेत्र दर्ज करें',
    dwellers: 'निवासियों की संख्या',
    dwellersPlaceholder: 'लोगों की संख्या दर्ज करें',
    openSpace: 'उपलब्ध खुला स्थान (m²)',
    openSpacePlaceholder: 'उपलब्ध स्थान दर्ज करें',
    roofType: 'छत का प्रकार',
    generateAnalysis: 'AI विश्लेषण उत्पन्न करें',
    getLocation: 'अपना वर्तमान स्थान प्राप्त करें',
    locationSuccess: 'स्थान सफलतापूर्वक पता चला',
    locationError: 'आपका स्थान प्राप्त करने में असमर्थ। कृपया इसे मैन्युअल रूप से दर्ज करें।',
    locationDenied: 'स्थान पहुंच अस्वीकृत। कृपया अपना स्थान मैन्युअल रूप से दर्ज करें।',
    locationUnavailable: 'स्थान उपलब्ध नहीं। कृपया अपना कनेक्शन जांचें और पुनः प्रयास करें।',
    locationTimeout: 'स्थान अनुरोध समय सीमा समाप्त। कृपया पुनः प्रयास करें।',
    locationHint: 'सुझावों के लिए टाइप करना शुरू करें या ऑटो-डिटेक्ट के लिए 📍 पर क्लिक करें',
    locationApiFallback: 'API कुंजी के बिना भी मुफ्त सेवाओं का उपयोग करके स्थान सुझाव काम करते हैं।',
    locationManualEntry: 'आप अभी भी ऊपर दिए गए फ़ील्ड में अपना स्थान मैन्युअल रूप से दर्ज कर सकते हैं।'
  },
  
  // Roof Types
  roofTypes: {
    rcc: 'RCC',
    tiled: 'टाइल वाली',
    metalSheet: 'धातु की चादर'
  },
  
  // Home Page
  home: {
    title: 'अपनी छत की वर्षा जल संचयन क्षमता की जांच करें',
    subtitle: 'वास्तविक समय के मौसम डेटा और भूजल विश्लेषण के साथ जल संचयन और रिचार्ज व्यवहार्यता पर तत्काल AI-संचालित अंतर्दृष्टि प्राप्त करें',
    getStarted: 'AI मूल्यांकन शुरू करें',
    learnMore: 'और जानें',
    threeDView: 'अपने घर का 3D दृश्य',
    threeDViewHint: '3D दृश्य: एक नए टैब में खुलता है। आप 3D दृश्य टैब को बंद करके या अपने ब्राउज़र के बैक बटन का उपयोग करके कभी भी इस मूल्यांकन पर वापस आ सकते हैं।',
    stats: {
      assessments: 'मूल्यांकन',
      accuracy: 'सटीकता',
      realtime: 'वास्तविक समय डेटा'
    },
    features: {
      saveWater: {
        title: 'पानी बचाएं',
        description: 'अपनी दैनिक आवश्यकताओं को पूरा करने और नगरपालिका आपूर्ति पर निर्भरता कम करने के लिए वर्षा जल का संचयन करें।'
      },
      rechargeGroundwater: {
        title: 'भूजल रिचार्ज',
        description: 'स्थानीय जलभृतों को स्थायी रूप से पुनः भरने और पर्यावरण संरक्षण में योगदान करने में मदद करें।'
      },
      reduceBills: {
        title: 'बिल कम करें',
        description: 'संग्रहीत वर्षा जल के उपयोग और स्मार्ट जल प्रबंधन के साथ जल बिलों को काफी कम करें।'
      }
    }
  },
  
  // About Page
  about: {
    title: 'वर्षा जल ऐप के बारे में',
    description: 'हमारे वर्षा जल संचयन विश्लेषण प्लेटफॉर्म के बारे में अधिक जानें'
  },
  
  // Results Page
  results: {
    title: 'के लिए परिणाम',
    subtitle: 'वास्तविक समय डेटा और AI द्वारा संचालित',
    currentTemperature: 'वर्तमान तापमान',
    precipitation: 'वर्षा',
    soilType: 'मिट्टी का प्रकार',
    downloadReport: 'रिपोर्ट डाउनलोड करें (PDF)',
    share: 'साझा करें',
    groundwaterAnalysis: 'भूजल स्तर विश्लेषण',
    groundwaterLevel: 'भूजल स्तर',
    station: 'स्टेशन',
    agency: 'एजेंसी',
    lastUpdated: 'अंतिम अपडेट',
    aiRecommendation: 'AI-संचालित सिफारिश',
    loading: 'आपके स्थान का विश्लेषण कर रहे हैं',
    loadingSubtitle: 'मौसम, मिट्टी और भूजल डेटा प्राप्त कर रहे हैं...',
    error: 'स्थान त्रुटि',
    errorSubtitle: 'इन लोकप्रिय शहरों को आज़माएं:',
    goBack: 'वापस जाएं',
    notAvailable: 'उपलब्ध नहीं',
    loadingData: 'लोड हो रहा है...',
    usingFallbackData: 'फॉलबैक डेटा का उपयोग कर रहे हैं',
    realDataAvailable: 'भारत WRIS API से वास्तविक डेटा प्राप्त किया गया!',
    mockDataNote: 'नोट: API अनुपलब्धता के कारण फॉलबैक डेटा का उपयोग कर रहे हैं'
  },
  
  // Groundwater
  groundwater: {
    bgl: 'bgl = जमीन के नीचे मीटर। छोटा मूल्य का मतलब है उच्च जल स्तर।',
    replay: 'दोहराएं',
    topsoil: 'ऊपरी मिट्टी',
    subsoil: 'अधोमिट्टी',
    bedrock: 'आधारशिला',
    waterTable: 'जल स्तर'
  },
  
  // Weather
  weather: {
    clearSky: 'साफ आसमान',
    partlyCloudy: 'आंशिक रूप से बादल',
    overcast: 'घटाटोप',
    lightRain: 'हल्की बारिश',
    moderateRain: 'मध्यम बारिश',
    heavyRain: 'भारी बारिश',
    thunderstorm: 'तूफान'
  },
  
  // Soil
  soil: {
    alluvial: 'जलोढ़ मिट्टी',
    clay: 'चिकनी मिट्टी',
    sandy: 'बलुई मिट्टी',
    loamy: 'दोमट मिट्टी',
    rocky: 'चट्टानी मिट्टी'
  },
  
  // Footer
  footer: {
    copyright: '© वर्षा जल ऐप प्रोटोटाइप'
  }
}
