import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

const sampleMonthly = [
  { name: 'Jan', rain: 12 }, { name: 'Feb', rain: 8 }, { name: 'Mar', rain: 15 },
  { name: 'Apr', rain: 22 }, { name: 'May', rain: 80 }, { name: 'Jun', rain: 140 },
  { name: 'Jul', rain: 220 }, { name: 'Aug', rain: 210 }, { name: 'Sep', rain: 160 },
  { name: 'Oct', rain: 60 }, { name: 'Nov', rain: 25 }, { name: 'Dec', rain: 10 },
]

export default function MonthlyRainfallChart({ data = sampleMonthly }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="card"
    >
      <h3 className="font-semibold mb-2">Rainfall Data (mm/month)</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="rain" fill="#34d399" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}


