interface DemographicsInsightsProps {
  locationBreakdown: { city: string; state?: string; count: number }[];
  genderBreakdown: { gender: string; count: number }[];
  ageBreakdown: { range: string; count: number }[];
  styleBreakdown: { style: string; count: number }[];
  ruleBased?: string[];
}

/**
 * Rule-based insights from demographics data.
 * Consumes location, gender, age, style breakdowns and emits insights.
 */
export function DemographicsInsights({
  locationBreakdown,
  genderBreakdown,
  ageBreakdown,
  styleBreakdown,
  ruleBased = [],
}: DemographicsInsightsProps) {
  const insights: string[] = [...ruleBased];

  if (locationBreakdown.length > 0) {
    const topCity = locationBreakdown[0];
    if (topCity) {
      const cityLabel = topCity.state ? `${topCity.city} (${topCity.state})` : topCity.city;
      const alreadyInRuleBased = ruleBased.some((r) => r.includes(topCity.city));
      if (!alreadyInRuleBased) {
        insights.push(`Principal local de origem: ${cityLabel} com ${topCity.count} clientes`);
      }
    }
  }

  if (styleBreakdown.length > 0) {
    const topStyle = styleBreakdown[0];
    if (topStyle) {
      const alreadyInRuleBased = ruleBased.some((r) => r.toLowerCase().includes(topStyle.style.toLowerCase()));
      if (!alreadyInRuleBased) {
        insights.push(`Estilo mais citado nas anotações: ${topStyle.style} (${topStyle.count} menções)`);
      }
    }
  }

  const totalWithAge = ageBreakdown.reduce((s, a) => s + a.count, 0);
  if (totalWithAge > 0) {
    const dominantRange = ageBreakdown.reduce((a, b) => (b.count > a.count ? b : a));
    const pct = Math.round((dominantRange.count / totalWithAge) * 100);
    insights.push(`Faixa etária predominante: ${dominantRange.range} anos (${pct}% dos clientes com data de nascimento)`);
  }

  const totalGender = genderBreakdown.reduce((s, g) => s + g.count, 0);
  if (totalGender > 0) {
    const topGender = genderBreakdown[0];
    if (topGender && topGender.gender !== 'unknown') {
      const pct = Math.round((topGender.count / totalGender) * 100);
      insights.push(`${topGender.gender === 'male' ? 'Masculino' : topGender.gender === 'female' ? 'Feminino' : topGender.gender}: ${pct}%`);
    }
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.3)] rounded-3xl p-6">
      <h3 className="font-['Playfair_Display',serif] text-lg text-white mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--shop-accent)]">lightbulb</span>
        Insights Demográficos
      </h3>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="text-white/90 text-sm flex items-start gap-2">
            <span className="text-[var(--shop-accent)]">·</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}
