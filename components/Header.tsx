"use client";

import React from "react";
import Link from "next/link";
import Navbar from "./screen/navbar";

interface HeaderProps {
  lockScreen: () => void;
  logOut: () => void;
}

export default function Header({ lockScreen, logOut }: HeaderProps) {
  return (
    <div className="absolute top-0 right-0 w-screen z-50">
      <div className="hidden md:block bg-ubt-blue text-white text-center text-xs py-1">
        <Link href="/ctf" className="hover:underline">
          Join Free CTF
        </Link>
      </div>
      <Navbar lockScreen={lockScreen} logOut={logOut} />
    </div>
  );
}
