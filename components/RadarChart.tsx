import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { DimensionScore } from '../types';

interface Props {
  data: DimensionScore[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm feishu-shadow">
        <div className="font-bold text-feishu-text mb-2 border-b border-gray-100 pb-1">{data.fullName}</div>
        <div className="flex items-center gap-4">
           <div className="flex flex-col">
             <span className="text-xs text-feishu-subtext mb-0.5">原始得分</span>
             <span className="text-feishu-blue font-semibold text-base font-mono">
               {data.rawScore}
               <span className="text-gray-400 text-xs font-normal ml-0.5">/{data.fullMark}</span>
             </span>
           </div>
           <div className="w-px h-8 bg-gray-200"></div>
           <div className="flex flex-col">
             <span className="text-xs text-feishu-subtext mb-0.5">达成率</span>
             <span className={`${data.percentage >= 80 ? 'text-emerald-500' : data.percentage >= 60 ? 'text-amber-500' : 'text-rose-500'} font-bold text-base font-mono`}>
               {data.percentage}%
             </span>
           </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomRadarChart: React.FC<Props> = ({ data }) => {
  // Normalize data to percentage for the chart shape
  const chartData = data.map(d => ({
    subject: d.name,
    fullName: d.name,
    rawScore: d.score,
    fullMark: d.maxScore,
    percentage: Math.round((d.score / d.maxScore) * 100)
  }));

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
          <PolarGrid stroke="#e2e8f0" strokeDasharray="4 4" />
          <PolarAngleAxis 
            dataKey="fullName" 
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
          />
          {/* Domain set to 0-100 to represent percentage */}
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="达成率"
            dataKey="percentage"
            stroke="#3370FF"
            strokeWidth={3}
            fill="#3370FF"
            fillOpacity={0.2}
            activeDot={{ r: 6, strokeWidth: 0, fill: '#3370FF' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomRadarChart;