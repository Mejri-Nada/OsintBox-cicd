"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect } from "react";
// Removed Icon as it's not used in this version of the component.
// You can re-add it if needed.

const Hero = () => {
  // useEffect to handle body overflow. It's currently set to an empty string,
  // which will default to the browser's normal overflow behavior.
  useEffect(() => {
    document.body.style.overflow = "";
  }, []);

  const leftAnimation = {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
    transition: { duration: 0.6 },
  };

  return (
    <section
      className="relative md:pt-40 md:pb-28 py-20 overflow-hidden z-1 bg-black text-center"
      id="main-banner"
      style={{ paddingTop:"15em", paddingBottom:"20em", background:"transparent"}}
    >
      <div className="container mx-auto lg:max-w-screen-xl px-4">
        <div className="grid grid-cols-12">
          {/* Main content column, now taking up the full width (col-span-12) */}
          <motion.div {...leftAnimation} className="col-span-12">
            <div className="flex gap-6 items-center justify-center mb-5 mt-24">
              <Image
                src="/images/logo/logo.svg" // Example icon URL
                //src={`https://cdn-icons-png.flaticon.com/512/7718/7718825.png`}
                alt="Security Icon GIF"
                width={40}
                height={40}
                unoptimized
              />
              <p className="text-white sm:text-28 text-18 mb-0">
                Your <span className="text-primary">Cyber</span> Intelligence
              </p>
            </div>
            <h1 className="font-medium lg:text-76 md:text-70 text-54 text-center text-white mb-10">
              Discover & Protect Your <span className="text-primary">Digital Assets</span> with Our <span className="text-primary">Tools</span>!
            </h1>
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <Link
                href="/port-scan"
                className="bg-primary border border-primary rounded-lg text-21 font-medium hover:bg-transparent hover:text-primary text-darkmode py-2 px-7 z-50 transition duration-200 ease-in-out"
              >
                Scan Ports
              </Link>
              <Link
                href="/phishing"
                className="bg-transparent border border-primary rounded-lg text-21 font-medium hover:bg-primary hover:text-darkmode text-primary py-2 px-7 transition duration-200 ease-in-out"
              >
                Check Phishing
              </Link>
              <Link
                href="/tech-scan"
                className="bg-primary border border-primary rounded-lg text-21 font-medium hover:bg-transparent hover:text-primary text-darkmode py-2 px-7 z-50 transition duration-200 ease-in-out"
              >
                Scan Technologies
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* This is the decorative div for the blurred gradient.
        I've changed the `from-tealGreen` class to `from-red-500`
        to use a strong red color.
      */}
      <div className="absolute w-50 h-50 bg-gradient-to-bl from-teal-500 from-70% to-black to-60% blur-400 rounded-full -top-64 -right-14 -z-1 opacity-100"></div>    </section>
  );
};

export default Hero;
