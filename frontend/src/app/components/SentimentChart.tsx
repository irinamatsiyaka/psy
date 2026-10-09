import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SentimentChartProps {
  data: Array<{ date: string; sentiment: number }>;
}

export function SentimentChart({ data }: SentimentChartProps) {
  return (
    <div className="w-full" style={{ height: '256px' }}>
      <ResponsiveContainer width="100%" height={256}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0D7CC" />
          <XAxis
            dataKey="date"
            stroke="#7C8A95"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#7C8A95"
            domain={[0, 10]}
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E0D7CC',
              borderRadius: '0.75rem',
              padding: '8px 12px'
            }}
          />
          <Line
            type="monotone"
            dataKey="sentiment"
            stroke="#7FB3A0"
            strokeWidth={3}
            dot={{ fill: '#7FB3A0', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
