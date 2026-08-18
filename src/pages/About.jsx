import { motion } from 'framer-motion'
import { useLanguage } from '../contexts/LanguageContext'

const Info = ({ title, text }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.35 }}
    className="card"
  >
    <h3 className="font-semibold mb-1">{title}</h3>
    <p className="text-sm text-slate-600">{text}</p>
  </motion.div>
)

export default function About() {
  const { t } = useLanguage()
  
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold text-emerald-700">{t('about.title')}</h2>
        <p className="text-slate-600 mt-2">{t('about.description')}</p>
      </section>
      <section className="grid sm:grid-cols-3 gap-4">
        <Info title="Recharge Pit" text="Vertical pit filled with gravel and sand to allow percolation." />
        <Info title="Recharge Trench" text="Linear trench to intercept runoff and enhance infiltration." />
        <Info title="Recharge Shaft" text="Deeper structure for areas with low permeability top soil." />
      </section>
    </div>
  )
}


