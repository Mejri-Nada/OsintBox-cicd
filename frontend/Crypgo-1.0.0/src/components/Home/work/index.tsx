"use client";
import Image from "next/image";
// Removed framer-motion imports as they are no longer used after removing motion.div
// import { motion, useInView } from "framer-motion";
// import { useRef } from "react";
// import { getImagePrefix } from "@/utils/utils";

const Work = () => {
  // Removed framer-motion related refs and animations
  // const ref = useRef(null);
  // const inView = useInView(ref);
  // const TopAnimation = { ... };
  // const bottomAnimation = { ... };

  // Updated services array with cybersecurity/OSINT focus and external icons
  const services = [
    {
      icon: "images/icons/icon-Services.svg", // Cybersecurity/OSINT Consulting
      text: "Cybersecurity Consulting",
    },
    {
      icon: "images/icons/icon-Services.svg", // OSINT Solutions
      text: "OSINT Solutions & Tools",
    },
    {
      icon: "images/icons/icon-Services.svg", // Custom Development
      text: "Custom Security Development",
    },
    {
      icon: "images/icons/icon-Services.svg", // Threat Hunting
      text: "Threat Hunting & Analysis",
    },
  ];

  return (
    <section className="md:pt-28" id="work" style={{paddingBottom:"10em", paddingTop:"10em", background: "transparent"}}>
      <div className="container mx-auto lg:max-w-screen-xl px-4">
        {/* Adjusted grid to be full width and content to be centered */}
        <div className="grid grid-cols-12 items-center justify-center text-center">
          <div className="col-span-12"> {/* This div now spans full width */}
            <p className="sm:text-28 text-18 text-white">
              Partner with <span className="text-primary">us</span>
            </p>
            <h2 className="sm:text-40 text-30 text-white lg:w-full md:w-full font-medium mx-auto"> {/* Adjusted width for centering */}
              Achieve Your Cybersecurity & <span className="text-primary">OSINT Goals</span>.
            </h2>
            <div className="grid md:grid-cols-2 gap-7 mt-11 max-w-2xl mx-auto"> {/* Centered the services grid */}
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-center sm:justify-start gap-5"> {/* Centered for mobile, left-aligned for sm+ */}
                  <div className="px-5 py-5 bg-light_grey bg-opacity-30 rounded-full flex-shrink-0">
                    <Image
                      src={service.icon}
                      alt={`${service.text} icon`}
                      width={40}
                      height={40}
                      unoptimized // Crucial for external image URLs
                    />
                  </div>
                  <p className="text-24 text-muted text-left">{service.text}</p> {/* Ensure text aligns with icon */}
                </div>
              ))}
            </div>
          </div>
          {/* The image column (lg:col-span-5) has been completely removed */}
        </div>
      </div>
    </section>
  );
};

export default Work;
