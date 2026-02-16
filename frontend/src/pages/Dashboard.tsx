import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, DollarSign, Target, Phone, Mail, Calendar, FileText, Handshake } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { activities } from '../data/activities'

const metrics = [
  { label: 'Total Leads', value: '18', change: '+12%', icon: Users, color: 'text-primary' },
  { label: 'Deals in Pipeline', value: '10', change: '+5%', icon: Target, color: 'text-warning' },
  { label: 'Estimated Revenue', value: '€285,500', change: '+18%', icon: DollarSign, color: 'text-success' },
  { label: 'Conversion Rate', value: '32%', change: '+3%', icon: TrendingUp, color: 'text-primary' },
]

const leadsData = [
  { month: 'Sep', leads: 8 },
  { month: 'Oct', leads: 12 },
  { month: 'Nov', leads: 15 },
  { month: 'Dec', leads: 11 },
  { month: 'Jan', leads: 18 },
  { month: 'Feb', leads: 14 },
]

const pipelineData = [
  { name: 'Prospect', value: 2, color: '#94a3b8' },
  { name: 'Qualified', value: 3, color: '#6366f1' },
  { name: 'Proposal', value: 3, color: '#f59e0b' },
  { name: 'Negotiation', value: 2, color: '#10b981' },
]

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
  deal: Handshake,
}

export function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">{m.label}</p>
                <p className="text-2xl font-bold mt-1">{m.value}</p>
                <p className="text-xs text-success mt-1">{m.change} vs last month</p>
              </div>
              <div className={`p-2 rounded-lg bg-surface-hover ${m.color}`}>
                <m.icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bar Chart - Leads */}
        <Card className="col-span-2">
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Leads — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={leadsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d4a" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d4a', borderRadius: '6px', color: '#fff' }}
              />
              <Bar dataKey="leads" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Donut Chart - Pipeline */}
        <Card>
          <h3 className="text-sm font-semibold text-text-secondary mb-4">Pipeline by Stage</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pipelineData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {pipelineData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2d2d4a', borderRadius: '6px', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pipelineData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <h3 className="text-sm font-semibold text-text-secondary mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {activities.map((a) => {
            const Icon = activityIcons[a.type]
            return (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="p-1.5 rounded-md bg-surface-hover text-text-secondary">
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{a.description}</p>
                  {a.contactName && (
                    <p className="text-xs text-text-secondary mt-0.5">{a.contactName}</p>
                  )}
                </div>
                <span className="text-xs text-text-secondary whitespace-nowrap">{a.date}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
