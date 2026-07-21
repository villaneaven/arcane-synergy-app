"use client";

import { AnalyticsHome } from "@/components/home/analytics-home";
import { WelcomeHome } from "@/components/home/welcome-home";
import { useHomePageType } from "@/components/home-page-provider";

export default function Home() {
  const { homePageType } = useHomePageType();

  switch (homePageType) {
    case "welcome":
      return <WelcomeHome />;
    case "analytics":
    default:
      return <AnalyticsHome />;
  }
}
