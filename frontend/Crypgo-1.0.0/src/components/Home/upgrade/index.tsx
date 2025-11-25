import Image from "next/image";
// import { upgradeData } from "@/app/api/data"; // No longer needed, data defined here
import { Icon } from "@iconify/react";
// import { getImagePrefix } from "@/utils/utils"; // Removed if not broadly used elsewhere

const Upgrade = () => {
  // Define new data for cybersecurity/OSINT benefits
  const cyberBenefitsData = [
    {
      title: "Proactive Threat Detection",
      icon: "mdi:security-search", // Iconify icon for security search
    },
    {
      title: "Comprehensive Digital Footprint",
      icon: "mdi:fingerprint", // Iconify icon for digital footprint/identity
    },
    {
      title: "Enhanced Data Security",
      icon: "mdi:lock-check", // Iconify icon for lock/security check
    },
    {
      title: "Real-time Vulnerability Alerts",
      icon: "mdi:alert-octagon", // Iconify icon for alerts/warnings
    },
    {
      title: "User-Friendly Interface",
      icon: "mdi:user-check", // Iconify icon for user experience
    },
    {
      title: "Scalable Intelligence",
      icon: "mdi:scale-balance", // Iconify icon for scalability/balance
    },
  ];

  return (
    <section className="md:py-40 py-20" id="upgrade" style={{paddingBottom:"10em", paddingTop:"10em", background: "transparent"}}>
      <div className="container mx-auto lg:max-w-screen-xl px-4">
        <div className="grid lg:grid-cols-2 sm:gap-0 gap-10 items-center">
          <div>
            <p className="text-primary sm:text-28 text-18 mb-3">Elevate Your Defense</p>
            <h2 className="text-white sm:text-40 text-30 font-medium mb-5">
              Unlock Superior Cyber Intelligence <span className="text-primary">Capabilities</span>
            </h2>
            <p className="text-muted text-opacity-60 text-18 mb-7">
              Gain a competitive edge with our advanced platform, providing unparalleled insights,
              <br className="md:block hidden" /> real-time threat detection, and robust digital asset protection.
            </p>
            <div className="grid sm:grid-cols-2 lg:w-70% text-nowrap sm:gap-10 gap-5">
              {cyberBenefitsData.map((item, index) => (
                <div key={index} className="flex gap-5">
                  <div>
                    <Icon
                      icon={item.icon} // Using the icon from cyberBenefitsData
                      width="24"
                      height="24"
                      className="text-white group-hover:text-primary"
                    />
                  </div>
                  <div>
                    <h4 className="text-18 text-muted text-opacity-60">
                      {item.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="">
              <Image
                src={`https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjQzdnZnd2U1MGx3M3F3c2c4MGRjM3ZqNmF1bmFlOHMxdWV5ZzV6YSZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/o0vw05mFjH8E8/giphy.gif`} // Placeholder for a cybersecurity themed GIF
                alt="Cybersecurity Upgrade"
                width={625}
                height={580}
                className="-mr-5"
                unoptimized // Crucial for external GIFs
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Upgrade;
