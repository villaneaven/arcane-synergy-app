"use client";

import { AnalyticsHome } from "@/components/home/analytics-home";
import { SearchHome } from "@/components/home/search-home";
import { useHomePageType } from "@/components/home-page-provider";

export default function Home() {
  const { homePageType } = useHomePageType();

  switch (homePageType) {
    case "search":
      return <SearchHome />;
    case "analytics":
    default:
      return <AnalyticsHome />;
  }
}
