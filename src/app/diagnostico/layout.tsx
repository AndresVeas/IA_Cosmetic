import { Manrope } from 'next/font/google';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-diagnostic-sans' });

export default function DiagnosticoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className={manrope.variable}>{children}</div>;
}
