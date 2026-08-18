import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const GroundwaterLevelAnimation = ({ currentLevel, isVisible = true }) => {
  const { t } = useLanguage();
  const [animationPhase, setAnimationPhase] = useState('initial'); // 'initial', 'before', 'transition', 'after'
  const [showRain, setShowRain] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Parse the groundwater level (assuming it's in meters)
  const parseLevel = (level) => {
    if (!level) return 0;
    const numLevel = parseFloat(level.toString().replace(/[^\d.-]/g, ''));
    return isNaN(numLevel) ? 0 : Math.abs(numLevel);
  };

  const currentLevelValue = parseLevel(currentLevel);
  const beforeLevel = currentLevelValue; // Current level before rainwater harvesting
  const afterLevel = Math.max(0, currentLevelValue - 1.5); // Improved level after implementation

  const startAnimation = () => {
    setIsAnimating(true);
    setAnimationPhase('initial');
    setShowRain(false);
    
    const phases = [
      { phase: 'before', delay: 1000 },
      { phase: 'transition', delay: 3000 },
      { phase: 'after', delay: 2000 }
    ];
    
    phases.forEach(({ phase, delay }) => {
      setTimeout(() => {
        setAnimationPhase(phase);
        if (phase === 'transition') {
          setShowRain(true);
          setTimeout(() => setShowRain(false), 2000);
        }
        if (phase === 'after') {
          setTimeout(() => setIsAnimating(false), 1000);
        }
      }, delay);
    });
  };

  useEffect(() => {
    if (isVisible && !isAnimating) {
      startAnimation();
    }
  }, [isVisible]);

  const getWaterLevel = () => {
    switch (animationPhase) {
      case 'before': return beforeLevel;
      case 'transition': return beforeLevel;
      case 'after': return afterLevel;
      default: return 0;
    }
  };

  const waterLevel = getWaterLevel();
  const improvement = beforeLevel - afterLevel;

  return (
    <div className="relative w-full h-80 bg-gradient-to-b from-sky-100 via-amber-50 to-amber-100 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-200">
      {/* Sky with clouds */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-sky-200 to-sky-100">
        <motion.div
          className="absolute top-2 left-4 w-8 h-4 bg-white rounded-full opacity-60"
          animate={{ x: [0, 20, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-4 right-8 w-6 h-3 bg-white rounded-full opacity-50"
          animate={{ x: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      {/* Ground surface with vegetation */}
      <div className="absolute top-16 left-0 right-0 h-6 bg-gradient-to-r from-green-400 via-green-500 to-green-600 z-20">
        <div className="absolute -top-2 left-0 right-0 h-8 bg-gradient-to-r from-green-500 to-green-700 rounded-t-full"></div>
        {/* Grass details */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-3 bg-green-600"
            style={{ left: `${i * 5}%`, top: -2 }}
            animate={{ 
              rotate: [0, 5, -5, 0],
              scaleY: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1
            }}
          />
        ))}
      </div>

      {/* Earth layers (with subtle textures and labels) */}
      <div className="absolute top-22 left-0 right-0 bottom-0">
        {/* Topsoil layer */}
        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-amber-200 to-amber-300">
          {/* Texture */}
          {[...Array(30)].map((_, i) => (
            <div
              key={`ts-${i}`}
              className="absolute w-1 h-1 bg-amber-400/60 rounded-full"
              style={{ left: `${(i * 3.3) % 100}%`, top: `${(i % 8) + 1}px` }}
            />
          ))}
          {/* Label */}
          <div className="absolute right-2 top-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300">{t('groundwater.topsoil')}</div>
        </div>
        {/* Subsoil layer */}
        <div className="absolute top-8 left-0 right-0 h-12 bg-gradient-to-b from-amber-300 to-amber-400">
          {[...Array(40)].map((_, i) => (
            <div
              key={`ss-${i}`}
              className="absolute w-1 h-1 bg-amber-500/50 rounded-full"
              style={{ left: `${(i * 2.5) % 100}%`, top: `${(i % 12) + 2}px` }}
            />
          ))}
          <div className="absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 border border-amber-400">{t('groundwater.subsoil')}</div>
        </div>
        {/* Weathered rock / saprolite */}
        <div className="absolute top-20 left-0 right-0 h-10 bg-gradient-to-b from-amber-400 to-amber-500">
          {[...Array(30)].map((_, i) => (
            <div
              key={`wr-${i}`}
              className="absolute w-1.5 h-0.5 bg-amber-600/60 rounded"
              style={{ left: `${(i * 3.1) % 100}%`, top: `${(i % 10) + 2}px` }}
            />
          ))}
          <div className="absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-300 text-amber-900 border border-amber-500">Weathered rock</div>
        </div>
        {/* Bedrock layer */}
        <div className="absolute top-[calc(20px+40px)] left-0 right-0 bottom-0 bg-gradient-to-b from-amber-500 to-amber-700">
          {[...Array(20)].map((_, i) => (
            <div
              key={`br-${i}`}
              className="absolute w-2 h-0.5 bg-amber-800/50 rounded"
              style={{ left: `${(i * 5) % 100}%`, top: `${(i % 14) + 4}px` }}
            />
          ))}
          <div className="absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 border border-amber-600">{t('groundwater.bedrock')}</div>
        </div>
      </div>

      {/* Rain animation during transition */}
      {showRain && (
        <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none z-30">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-4 bg-blue-400 opacity-60"
              style={{ left: `${Math.random() * 100}%` }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: [0, 400], opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
          {/* Infiltration arrows */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`inf-${i}`}
              className="absolute text-blue-700/70"
              style={{ left: `${10 + i * 10}%`, top: 80 }}
              animate={{ y: [0, 40, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
            >
              ↓
            </motion.div>
          ))}
        </div>
      )}

      {/* Groundwater level - Before (current level) */}
      <motion.div
        className="absolute left-0 right-0 bg-gradient-to-t from-blue-400 to-blue-500 opacity-70"
        initial={{ height: 0 }}
        animate={{ 
          height: `${(beforeLevel / 15) * 100}%`,
          opacity: animationPhase === 'before' ? 0.7 : 0.3
        }}
        transition={{ duration: 1, ease: "easeOut" }}
        style={{ bottom: 0 }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
        <motion.div 
          className="absolute top-2 left-4 text-xs font-bold text-blue-800 bg-white px-2 py-1 rounded shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: animationPhase === 'before' ? 1 : 0 }}
        >
          Before: {beforeLevel.toFixed(1)}m bgl
        </motion.div>
      </motion.div>

      {/* Groundwater level - After (improved level) */}
      <motion.div
        className="absolute left-0 right-0 bg-gradient-to-t from-blue-600 to-blue-700"
        initial={{ height: 0, opacity: 0 }}
        animate={{ 
          height: `${(afterLevel / 15) * 100}%`,
          opacity: animationPhase === 'after' ? 1 : 0
        }}
        transition={{ 
          duration: 2, 
          ease: "easeInOut",
          delay: animationPhase === 'after' ? 0 : 0
        }}
        style={{ bottom: 0 }}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-700"></div>
        <motion.div 
          className="absolute top-2 right-4 text-xs font-bold text-blue-900 bg-white px-2 py-1 rounded shadow"
          initial={{ opacity: 0 }}
          animate={{ opacity: animationPhase === 'after' ? 1 : 0 }}
        >
          After: {afterLevel.toFixed(1)}m bgl
        </motion.div>
      </motion.div>

      {/* Water ripples animation */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-3 bg-blue-300 opacity-40"
        animate={{ 
          scaleX: [1, 1.05, 1],
          opacity: [0.2, 0.6, 0.2]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Rainwater harvesting system visualization */}
      {animationPhase === 'after' && (
        <motion.div
          className="absolute top-20 right-4 w-8 h-12 bg-gray-300 rounded-t-lg border-2 border-gray-400"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="absolute top-0 left-1 right-1 h-2 bg-blue-200 rounded-t"></div>
          <div className="absolute top-2 left-2 right-2 h-1 bg-blue-300"></div>
          <div className="absolute top-3 left-3 right-3 h-1 bg-blue-400"></div>
        </motion.div>
      )}

      {/* Improvement indicator with explicit numbers */}
      <motion.div
        className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg"
        initial={{ opacity: 0, y: -20, scale: 0.8 }}
        animate={{ 
          opacity: animationPhase === 'after' ? 1 : 0,
          y: animationPhase === 'after' ? 0 : -20,
          scale: animationPhase === 'after' ? 1 : 0.8
        }}
        transition={{ delay: animationPhase === 'after' ? 0.5 : 0 }}
      >
        💧 Before {beforeLevel.toFixed(1)}m bgl → After {afterLevel.toFixed(1)}m bgl (↑{improvement.toFixed(1)}m)
      </motion.div>

      {/* Unit clarification */}
      <div className="absolute top-2 left-2 text-[10px] bg-white/90 text-slate-700 px-2 py-1 rounded border border-slate-200 shadow-sm">
        {t('groundwater.bgl')}
      </div>

      {/* Depth markers */}
      <div className="absolute right-2 top-24 bottom-2 w-1 bg-gray-600 opacity-60">
        {[0, 3, 6, 9, 12, 15].map((depth) => (
          <div key={depth} className="absolute w-3 h-0.5 bg-gray-700 -right-1" 
               style={{ bottom: `${(depth / 15) * 100}%` }}>
            <span className="absolute -right-10 -top-1 text-xs text-gray-700 font-semibold">{depth}m</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 rounded-lg p-2 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-blue-400 rounded"></div>
          <span>Before RWH</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-600 rounded"></div>
          <span>After RWH</span>
        </div>
      </div>

      {/* Restart Button */}
      <motion.button
        onClick={startAnimation}
        disabled={isAnimating}
        className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg transition-all duration-200"
        whileHover={{ scale: isAnimating ? 1 : 1.05 }}
        whileTap={{ scale: isAnimating ? 1 : 0.95 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        {isAnimating ? '⏳ Playing...' : `🔄 ${t('groundwater.replay')}`}
      </motion.button>
    </div>
  );
};

export default GroundwaterLevelAnimation;
