import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

const Card = ({ icon, title, text, delay = 0, color = "emerald" }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.9 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true }}
    transition={{ 
      duration: 0.6, 
      delay: delay,
      ease: "easeOut"
    }}
    whileHover={{ 
      scale: 1.05, 
      y: -10,
      transition: { duration: 0.2 }
    }}
    className={`card text-center relative overflow-hidden group cursor-pointer bg-gradient-to-br from-white to-${color}-50 border-${color}-200 hover:shadow-xl transition-all duration-300`}
  >
    {/* Animated background */}
    <motion.div
      className={`absolute inset-0 bg-gradient-to-br from-${color}-100 to-${color}-200 opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
      initial={{ scale: 0 }}
      whileHover={{ scale: 1 }}
      transition={{ duration: 0.3 }}
    />
    
    {/* Icon with animation */}
    <motion.div 
      className="text-4xl mb-4 relative z-10"
      animate={{ 
        rotate: [0, 5, -5, 0],
        scale: [1, 1.1, 1]
      }}
      transition={{ 
        duration: 3,
        repeat: Infinity,
        repeatDelay: 2,
        delay: delay
      }}
    >
      {icon}
    </motion.div>
    
    <h3 className={`font-bold text-xl mb-3 text-${color}-700 relative z-10`}>{title}</h3>
    <p className="text-slate-600 text-sm relative z-10">{text}</p>
    
    {/* Shine effect */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20"
      initial={{ x: "-100%" }}
      whileHover={{ x: "100%" }}
      transition={{ duration: 0.6 }}
    />
  </motion.div>
)

export default function Home() {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <motion.section 
        className="text-center pt-12 pb-16 relative overflow-hidden rounded-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-100 via-blue-50 to-cyan-100" />
        <motion.div
          className="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=1400&auto=format&fit=crop')] bg-cover bg-center opacity-10"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
        
        {/* Floating elements */}
        <motion.div
          className="absolute top-10 left-10 text-4xl opacity-20"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          💧
        </motion.div>
        <motion.div
          className="absolute top-20 right-20 text-3xl opacity-20"
          animate={{
            y: [0, 15, 0],
            rotate: [0, -5, 0]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 1
          }}
        >
          🌧️
        </motion.div>
        <motion.div
          className="absolute bottom-20 left-20 text-3xl opacity-20"
          animate={{
            y: [0, -10, 0],
            rotate: [0, 3, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 2
          }}
        >
          🌱
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-6xl font-extrabold bg-gradient-to-r from-emerald-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent tracking-tight mb-6"
        >
          {t('home.title')}
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-slate-600 text-lg max-w-3xl mx-auto mb-8"
        >
          {t('home.subtitle')}
        </motion.p>
        
        <motion.div 
          className="mt-8 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link 
              to="/form" 
              className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <span className="text-2xl">🚀</span>
              {t('home.getStarted')}
            </Link>
          </motion.div>
        </motion.div>
        
        {/* Stats */}
        <motion.div 
          className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {[
            { number: "10K+", label: t('home.stats.assessments') },
            { number: "95%", label: t('home.stats.accuracy') },
            { number: "24/7", label: t('home.stats.realtime') }
          ].map((stat, index) => (
            <motion.div 
              key={index}
              className="text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1 + (index * 0.1) }}
            >
              <div className="text-2xl font-bold text-emerald-600">{stat.number}</div>
              <div className="text-sm text-slate-600">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        className="grid sm:grid-cols-3 gap-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <Card 
          icon="💧" 
          title={t('home.features.saveWater.title')} 
          text={t('home.features.saveWater.description')} 
          delay={0}
          color="blue"
        />
        <Card 
          icon="🌍" 
          title={t('home.features.rechargeGroundwater.title')} 
          text={t('home.features.rechargeGroundwater.description')} 
          delay={0.2}
          color="green"
        />
        <Card 
          icon="💰" 
          title={t('home.features.reduceBills.title')} 
          text={t('home.features.reduceBills.description')} 
          delay={0.4}
          color="emerald"
        />
      </motion.section>
    </div>
  )
}


