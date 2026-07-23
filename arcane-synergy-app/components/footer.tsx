import Image from "next/image";

export default function Footer() {
  return (
    <footer className="flex h-25 w-full items-center justify-center border-t bg-background font-sans dark:bg-black gap-4">
      <div className="flex flex-col items-center gap-3">
        <Image
          src="https://static.wixstatic.com/media/2ccfb1_5238aad1e18c48b9bdb2843f28b5251d~mv2.png"
          alt="Kaizen Clinical Partners Logo-2021.png"
          height="38"
          width="130"
          priority
        />
        <p className="text-sm text-muted-foreground">
          &copy; 2026 Kaizen Clinical Partners. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
