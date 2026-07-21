"use client";

import { AnalyticsHome } from "@/components/home/analytics-home";
import { useHomePageType } from "@/components/home-page-provider";

export default function Home() {
  const { homePageType } = useHomePageType();

  switch (homePageType) {
    case "analytics":
    default:
      return <AnalyticsHome />;
  }
}
