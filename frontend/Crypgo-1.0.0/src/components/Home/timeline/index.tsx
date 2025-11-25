"use client";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
// import { timelineData } from "@/app/api/data"; // No longer needed as data is defined here
// import { motion, useInView } from "framer-motion"; // Removed framer-motion imports
// import { useRef } from "react"; // Removed as useInView is no longer used
// import { getImagePrefix } from "@/utils/utils"; // Removed if not broadly used elsewhere

const TimeLine = () => {
  // const ref = useRef(null); // Removed
  // const inView = useInView(ref); // Removed

  // Removed framer-motion specific animation objects
  // const TopAnimation = {
  //   initial: { y: "-100%", opacity: 0 },
  //   animate: inView ? { y: 0, opacity: 1 } : { y: "-100%", opacity: 0 },
  //   transition: { duration: 0.6, delay: 0.4 },
  // };

  // New data for cybersecurity/OSINT journey steps
  const cyberTimelineData = [
    {
      icon: "/images/icons/icon-Services.svg",
      title: "Enhanced Security Posture",
      text: "Strengthen your defenses with proactive intelligence gathering.",
    },
    {
      icon: "/images/icons/icon-Services.svg", // Example icon URL
      title: "Threat Analysis",
      text: "Analyze gathered intelligence to assess vulnerabilities.",
    },
    {
      icon: "/images/icons/icon-Services.svg", // Example icon URL
      title: "Mitigation & Action",
      text: "Implement strategies and use insights to secure detected weaknesses.",
    },
    {
      icon: "/images/icons/icon-Services.svg", // Example icon URL
      title: "Continuous Monitoring",
      text: "Maintain ongoing surveillance to detect new threats and ensure persistent security.",
    },
  ];

  return (
    <section className="md:pt-40 pt-9" id="development" style={{paddingBottom:"10em", paddingTop:"10em", background: "transparent"}}>
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md lg:px-16 px-4">
        <div className="text-center">
          <div // Replaced motion.div
          >
            <p className="text-muted sm:text-28 text-18 mb-9">
              Your <span className="text-primary">Cyber</span> Journey
            </p>
            <h2 className="text-white sm:text-40 text-30 font-medium lg:w-80% mx-auto mb-20">
              Navigate Your Digital Defense with Our Expert <span className="text-primary">Process</span>
            </h2>
          </div>
          <div // Replaced motion.div and removed ref={ref}
          >
            <div className="md:block hidden relative">
              <div>
                <Image
                  src={`https://i.pinimg.com/originals/7f/96/24/7f9624334d322f6c0f2268ac2db7a0db.gif`} // GIF URL
                  alt="Cybersecurity Timeline"
                  width={920}
                  height={700}
                  className="w-40% mx-auto"
                  unoptimized // For external GIF
                />
              </div>
              {/* Individual timeline points for larger screens */}
              <div className="absolute lg:top-40 top-36 lg:left-0 -left-20 w-72 flex items-center gap-6" style={{marginTop: "5em" }}>
                <div className="text-right">
                  <h5 className="text-muted text-28 mb-3">
                    {cyberTimelineData[0].title}
                  </h5>
                  <p className="text-18 text-muted text-opacity-60">
                    {cyberTimelineData[0].text}
                  </p>
                </div>
                <div className="bg-light_grey bg-opacity-45 backdrop-blur-sm px-6 py-2 h-fit rounded-full">
                  <Image
                    src={cyberTimelineData[0].icon}
                    alt={cyberTimelineData[0].title}
                    width={44}
                    height={44}
                    className="w-16 h-16"
                    unoptimized // For external SVG
                  />
                </div>
              </div>


              <div className="absolute lg:bottom-0 bottom-36 lg:right-0 -right-20 w-72 flex items-center gap-6"  style={{marginTop: "5em" }}>
                
                <div className="bg-light_grey bg-opacity-45 backdrop-blur-sm p-6 h-fit rounded-full">
                  <Image
                    src={cyberTimelineData[1].icon}
                    alt={cyberTimelineData[1].title}
                    width={44}
                    height={44}
                    unoptimized // For external SVG
                  />
                </div>


                <div className="text-left">
                  <h5 className="text-muted text-28 mb-3">
                    {cyberTimelineData[1].title}
                  </h5>
                  <p className="text-18 text-muted text-opacity-60">
                    {cyberTimelineData[1].text}
                  </p>
                </div>

              </div>


              <div className="absolute lg:bottom-48 bottom-36 lg:left-0 -left-0 w-72 flex items-center gap-6" style={{marginBottom: "2.5em" }}>
                <div className="text-right">
                  <h5 className="text-muted text-28 mb-3">
                    {cyberTimelineData[2].title}
                  </h5>
                  <p className="text-18 text-muted text-opacity-60">
                    {cyberTimelineData[2].text}
                  </p>
                </div>
                <div className="bg-light_grey bg-opacity-45 backdrop-blur-sm px-6 py-2 h-fit rounded-full">
                  <Image
                    src={cyberTimelineData[2].icon}
                    alt={cyberTimelineData[2].title}
                    width={44}
                    height={44}
                    className="w-16 h-16"
                    unoptimized // For external SVG
                  />
                </div>
              </div>
              <div className="absolute lg:bottom-48 bottom-36 lg:right-0 -right-20 w-72 flex items-center gap-6" style={{marginBottom: "5em" }}>
                <div className="bg-light_grey bg-opacity-45 backdrop-blur-sm px-6 py-2 h-fit rounded-full">
                  <Image
                    src={cyberTimelineData[3].icon}
                    alt={cyberTimelineData[3].title}
                    width={44}
                    height={44}
                    className="w-16 h-16"
                    unoptimized // For external SVG
                  />
                </div>
                <div className="text-left">
                  <h5 className="text-muted text-nowrap text-28 mb-3">
                    {cyberTimelineData[3].title}
                  </h5>
                  <p className="text-18 text-muted text-opacity-60">
                    {cyberTimelineData[3].text}
                  </p>
                </div>
              </div>
            </div>
            {/* Timeline points for smaller screens (mobile) using the same data */}
            <div className="grid sm:grid-cols-2 gap-8 md:hidden" >
              {cyberTimelineData.map((item, index) => (
                <div key={index} className="flex items-center gap-6">
                  <div className="bg-light_grey bg-opacity-45 p-6 rounded-full">
                    <Image
                      src={item.icon}
                      alt={item.title}
                      width={44}
                      height={44}
                      unoptimized // For external SVG
                    />
                  </div>
                  <div className="text-start">
                    <h4 className="text-28 text-muted mb-2">{item.title}</h4>
                    <p className="text-muted text-opacity-60 text-18">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimeLine;
