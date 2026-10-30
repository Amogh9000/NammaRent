'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface CountUpValueProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export const CountUpValue: React.FC<CountUpValueProps> = ({
  value,
  prefix = '',
  suffix = '',
  duration = 1.4,
  decimals = 0,
  className = '',
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef({ val: 0 });

  useEffect(() => {
    countRef.current.val = 0;
    const ctx = gsap.context(() => {
      gsap.to(countRef.current, {
        val: value,
        duration,
        ease: 'power2.out',
        onUpdate: () => {
          if (spanRef.current) {
            const formatted = decimals > 0
              ? countRef.current.val.toFixed(decimals)
              : Math.round(countRef.current.val).toLocaleString();
            spanRef.current.textContent = `${prefix}${formatted}${suffix}`;
          }
        },
      });
    });

    return () => ctx.revert();
  }, [value, prefix, suffix, duration, decimals]);

  return (
    <span ref={spanRef} className={className}>
      {prefix}0{suffix}
    </span>
  );
};
