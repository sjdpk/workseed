import type { Metadata } from "next";
import { DM_Mono, Figtree } from "next/font/google";
import { Landing } from "@/components/landing/Landing";

/* Display + body: Figtree · Data/labels: DM Mono. Exposed as CSS variables and
   consumed by landing.css, so the marketing page keeps its own typography
   without touching the Inter used inside the app. */
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  variable: "--font-figtree",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Workseeds — HR, time and payroll on one record",
  description:
    "Workseeds keeps records, leave, timesheets, payroll and reviews on one system — so your people team spends its week on people, not on chasing signatures.",
};

export default function Home() {
  return (
    <div className={`${figtree.variable} ${dmMono.variable}`}>
      <Landing />
    </div>
  );
}
