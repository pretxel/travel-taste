'use client';

import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }

  return context;
}

const ChartContainer = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentProps<'div'> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = 'Chart';

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join('\n')}
}
`
          )
          .join('\n'),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<'div'> & {
      config?: ChartConfig;
    }
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn('rounded-lg border bg-background p-2 text-xs shadow-sm', className)}
      {...props}
    />
  );
});
ChartTooltipContent.displayName = 'ChartTooltipContent';

const ChartLegend = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentProps<'div'> & {
    config?: ChartConfig;
  }
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn('flex items-center gap-4', className)} {...props} />;
});
ChartLegend.displayName = 'ChartLegend';

const ChartLegendItem = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentProps<'div'> & {
    name: string;
    config?: ChartConfig;
  }
>(({ className, name, config, ...props }, ref) => {
  const { config: contextConfig } = useChart();
  const chartConfig = config || contextConfig;
  const itemConfig = chartConfig[name];

  return (
    <div ref={ref} className={cn('flex items-center gap-2', className)} {...props}>
      {itemConfig?.icon && (
        <itemConfig.icon
          className="h-4 w-4"
          style={{
            color: `var(--color-${name})`,
          }}
        />
      )}
      <span>{itemConfig?.label || name}</span>
    </div>
  );
});
ChartLegendItem.displayName = 'ChartLegendItem';

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendItem };
