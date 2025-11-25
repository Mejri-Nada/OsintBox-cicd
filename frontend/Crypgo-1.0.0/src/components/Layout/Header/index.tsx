"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { headerData } from "../Header/Navigation/menuData";
import Logo from "./Logo";
import HeaderLink from "../Header/Navigation/HeaderLink";
import MobileHeaderLink from "../Header/Navigation/MobileHeaderLink";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

const Header: React.FC = () => {
  const pathUrl = usePathname();
  const { theme, setTheme } = useTheme();

  const [navbarOpen, setNavbarOpen] = useState(false);
  const [sticky, setSticky] = useState(false);

  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    setSticky(window.scrollY >= 80);
  };

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        navbarOpen
      ) {
        setNavbarOpen(false);
      }
    },
    [navbarOpen]
  );

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [navbarOpen, handleClickOutside]);

  useEffect(() => {
    document.body.style.overflow = navbarOpen ? "hidden" : "";
  }, [navbarOpen]);

  return (
    <header
      className={`fixed top-0 z-40 w-full transition-all duration-300 ${
        sticky ? "shadow-lg bg-white dark:bg-darkmode" : "shadow-none"
      }`}
    >
      <div className="container mx-auto max-w-screen-xl flex items-center justify-between px-4 py-4">
        <Logo />
        <nav className="hidden lg:flex items-center space-x-8">
          {headerData.map((item, index) => (
            <HeaderLink key={index} item={item} />
          ))}
        </nav>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setNavbarOpen(!navbarOpen)}
            className="block lg:hidden p-2 rounded-lg"
            aria-label="Toggle mobile menu"
          >
            <span className="block w-6 h-0.5 bg-black dark:bg-white"></span>
            <span className="block w-6 h-0.5 bg-black dark:bg-white mt-1.5"></span>
            <span className="block w-6 h-0.5 bg-black dark:bg-white mt-1.5"></span>
          </button>
        </div>
      </div>

      {navbarOpen && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 z-40" />
      )}

      <div
        ref={mobileMenuRef}
        className={`lg:hidden fixed top-0 right-0 h-full w-full bg-white dark:bg-darkmode shadow-lg transform transition-transform duration-300 max-w-xs ${
          navbarOpen ? "translate-x-0" : "translate-x-full"
        } z-50`}
      >
        <div className="flex items-center justify-between p-4">
          <Logo />
          <button
            onClick={() => setNavbarOpen(false)}
            className="w-6 h-6 dark:invert"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="flex flex-col items-start p-4 space-y-2">
          {headerData.map((item, index) => (
            <MobileHeaderLink key={index} item={item} />
          ))}
        </nav>
      </div>
    </header>
  );
};

export default Header;
export { Header, Logo, HeaderLink, MobileHeaderLink, headerData };
