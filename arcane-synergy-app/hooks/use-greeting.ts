import { useEffect, useState } from "react";

const TIME_GREETINGS = {
  morning: ["Good morning", "Rise and shine", "Morning"],
  afternoon: ["Good afternoon", "Hope your day's going well"],
  evening: ["Good evening", "Evening"],
};

const CASUAL_GREETINGS = [
  "Hi",
  "Welcome",
  "Good to see you",
  "Hey there",
  "Glad you're here",
  "Great to have you back",
  "Ready when you are",
];

function getGreetingPool() {
  const hour = new Date().getHours();
  const timeGreetings =
    hour < 12
      ? TIME_GREETINGS.morning
      : hour < 18
        ? TIME_GREETINGS.afternoon
        : TIME_GREETINGS.evening;

  return [...timeGreetings, ...CASUAL_GREETINGS];
}

export function useGreeting() {
  const [greeting, setGreeting] = useState(TIME_GREETINGS.morning[0]);

  useEffect(() => {
    const pool = getGreetingPool();
    setGreeting(pool[Math.floor(Math.random() * pool.length)]);
  }, []);

  return greeting;
}
