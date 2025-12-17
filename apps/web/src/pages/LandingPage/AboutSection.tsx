import { useEffect, useRef } from 'react';
import { Heading, Text, Section, Grid } from '@/components/design-system';

const features = [
  { icon: 'schedule', text: 'Fila online' },
  { icon: 'workspace_premium', text: 'Produtos premium' },
  { icon: 'groups', text: 'Equipe experiente' },
  { icon: 'local_parking', text: 'Estacionamento fácil' },
];

export function AboutSection() {
  const imageLoadStartRef = useRef<number | null>(null);
  const iconRenderStartRef = useRef<number | null>(null);

  useEffect(() => {
    // #region agent log
    imageLoadStartRef.current = performance.now();
    iconRenderStartRef.current = performance.now();
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AboutSection.tsx:17',message:'AboutSection mount',data:{materialSymbolsCheck:document.fonts.check('24px Material Symbols Outlined')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    
    // Check icon rendering after a short delay
    setTimeout(() => {
      const icons = document.querySelectorAll('.material-symbols-outlined');
      const renderTime = iconRenderStartRef.current ? performance.now() - iconRenderStartRef.current : null;
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AboutSection.tsx:23',message:'Icon rendering check',data:{iconCount:icons.length,renderTimeMs:renderTime,materialSymbolsCheck:document.fonts.check('24px Material Symbols Outlined')},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    }, 100);
    // #endregion
  }, []);
  return (
    <Section id="about" variant="primary">
      <div className="lg:hidden space-y-8">
        <div>
          <Heading level={2} className="mb-6">
            Sobre
          </Heading>
          <Grid cols={{ mobile: 2 }} gap="md" className="mb-8">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#D4AF37] text-2xl">
                  {feature.icon}
                </span>
                <Text size="sm" variant="secondary">
                  {feature.text}
                </Text>
              </div>
            ))}
          </Grid>
        </div>
        <div className="aspect-[4/5] rounded-xl overflow-hidden border border-[rgba(212,175,55,0.2)] shadow-lg">
          <img
            src="/barbershop-image.jpg"
            alt="Interior da barbearia"
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onLoad={() => {
              // #region agent log
              const loadTime = imageLoadStartRef.current ? Date.now() - imageLoadStartRef.current : null;
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AboutSection.tsx:38',message:'Landing page image load success',data:{imageSrc:'/barbershop-image.jpg',loadTimeMs:loadTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
            }}
            onError={(e) => {
              // #region agent log
              const loadTime = imageLoadStartRef.current ? Date.now() - imageLoadStartRef.current : null;
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AboutSection.tsx:46',message:'Landing page image load error, using fallback',data:{imageSrc:'/barbershop-image.jpg',loadTimeMs:loadTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80';
            }}
          />
        </div>
      </div>

      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 items-center">
        <div>
          <Heading level={2} className="mb-6">
            Sobre
          </Heading>
          <Grid cols={{ mobile: 2 }} gap="lg">
            {features.map((feature) => (
              <div key={feature.text} className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[#D4AF37] text-3xl">
                  {feature.icon}
                </span>
                <Text size="base" variant="secondary">
                  {feature.text}
                </Text>
              </div>
            ))}
          </Grid>
        </div>
        <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.2)] shadow-lg">
          <img
            src="/barbershop-image.jpg"
            alt="Interior da barbearia"
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onLoad={() => {
              // #region agent log
              const loadTime = imageLoadStartRef.current ? Date.now() - imageLoadStartRef.current : null;
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AboutSection.tsx:75',message:'Landing page image load success (desktop)',data:{imageSrc:'/barbershop-image.jpg',loadTimeMs:loadTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
            }}
            onError={(e) => {
              // #region agent log
              const loadTime = imageLoadStartRef.current ? Date.now() - imageLoadStartRef.current : null;
              fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AboutSection.tsx:83',message:'Landing page image load error, using fallback (desktop)',data:{imageSrc:'/barbershop-image.jpg',loadTimeMs:loadTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
              // #endregion
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80';
            }}
          />
        </div>
      </div>
    </Section>
  );
}
