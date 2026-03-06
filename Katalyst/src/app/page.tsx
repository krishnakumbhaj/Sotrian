'use client'
import React, { useEffect, useRef } from 'react';
import { Shield, Globe, Users, ArrowRight, Award, TrendingUp, Lock } from 'lucide-react';
import logo from '@/app/images/Logo.png'
import Image from 'next/image';
import logo_image from '@/app/images/Logo_name.png'
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useNavigationWithLoader } from "@/app/hooks/useNavigationWithLoader";
const KatalystLandingPage = () => {
  const { navigate } = useNavigationWithLoader();
  const heroRef = useRef(null);
  const metricsRef = useRef(null);
  const capabilitiesRef = useRef(null);
  const industriesRef = useRef(null);
  const testimonialsRef = useRef(null);
  const integrationsRef = useRef(null);
  const ctaRef = useRef(null);
  const navRef = useRef(null);



useEffect(() => {
            gsap.registerPlugin(ScrollTrigger);
            initAnimations();

            return () => {
                        gsap.killTweensOf("*");
            };
}, []);

  const initAnimations = () => {
    // Use imported gsap and ScrollTrigger directly
    gsap.registerPlugin(ScrollTrigger);

//     Navbar animation - slide down from top
    gsap.fromTo(navRef.current, 
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power3.out" }
    );

    // Hero section animations
    const heroTl = gsap.timeline();
    heroTl
      .fromTo(".hero-title", 
        { y: 20, opacity: 0, scale: 0.8 },
        { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: "power4.out" }
      )
      .fromTo(".hero-subtitle", 
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
        "-=0.6"
      )
      .fromTo(".hero-cta", 
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" },
        "-=0.4"
      );

    // Floating animation for hero elements
    gsap.to(".hero-title", {
      y: -10,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    });

    // Metrics counter animation
    ScrollTrigger.create({
      trigger: metricsRef.current,
      start: "top 80%",
      onEnter: () => {
        gsap.fromTo(".metric-item", 
          { scale: 0, rotation: 180, opacity: 0 },
          { 
            scale: 1, 
            rotation: 0, 
            opacity: 1, 
            duration: 0.8, 
            stagger: 0.2, 
            ease: "back.out(1.7)" 
          }
        );
        
        // Animate numbers counting up
        document.querySelectorAll('.metric-number').forEach((el, index) => {
          const finalText = el.textContent;
          el.textContent = '0';
          
          gsap.to(el, {
            duration: 2,
            delay: index * 0.2,
            onUpdate: function() {
              const progress = this.progress();
              if (finalText && finalText.includes('M+')) {
                el.textContent = Math.floor(progress * 500) + 'M+';
              } else if (finalText && finalText.includes('%')) {
                el.textContent = (progress * 99.99).toFixed(2) + '%';
              } else if (finalText && finalText.includes('ms')) {
                el.textContent = '< ' + Math.floor(progress * 100) + 'ms';
              } else if (finalText && finalText.includes('+')) {
                el.textContent = Math.floor(progress * 150) + '+';
              }
            },
            onComplete: () => {
              el.textContent = finalText;
            }
          });
        });
      }
    });

    // Capabilities cards animation
    ScrollTrigger.create({
      trigger: capabilitiesRef.current,
      start: "top 70%",
      onEnter: () => {
        gsap.fromTo(".capability-card", 
          { y: 100, opacity: 0, rotationX: 45 },
          { 
            y: 0, 
            opacity: 1, 
            rotationX: 0,
            duration: 1, 
            stagger: 0.3, 
            ease: "power3.out" 
          }
        );
      }
    });

    // Hover animations for capability cards
    document.querySelectorAll('.capability-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { 
          scale: 1.05, 
          y: -10, 
          duration: 0.3, 
          ease: "power2.out",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
        });
        gsap.to(card.querySelector('.capability-icon'), {
          rotation: 360,
          scale: 1.2,
          duration: 0.5,
          ease: "power2.out"
        });
      });
      
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { 
          scale: 1, 
          y: 0, 
          duration: 0.3, 
          ease: "power2.out",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
        });
        gsap.to(card.querySelector('.capability-icon'), {
          rotation: 0,
          scale: 1,
          duration: 0.3,
          ease: "power2.out"
        });
      });
    });

    // Industries section animation
    ScrollTrigger.create({
      trigger: industriesRef.current,
      start: "top 75%",
      onEnter: () => {
        gsap.fromTo(".industry-card", 
          { x: -100, opacity: 0, skewX: 15 },
          { 
            x: 0, 
            opacity: 1, 
            skewX: 0,
            duration: 0.8, 
            stagger: 0.2, 
            ease: "power3.out" 
          }
        );
        
        gsap.fromTo(".growth-badge", 
          { scale: 0, rotation: 180 },
          { 
            scale: 1, 
            rotation: 0,
            duration: 0.6, 
            stagger: 0.1, 
            ease: "back.out(2)" 
          }
        );
      }
    });

    // Testimonials animation
    ScrollTrigger.create({
      trigger: testimonialsRef.current,
      start: "top 80%",
      onEnter: () => {
        gsap.fromTo(".testimonial-card", 
          { scale: 0.8, opacity: 0, rotationY: 45 },
          { 
            scale: 1, 
            opacity: 1, 
            rotationY: 0,
            duration: 1, 
            stagger: 0.3, 
            ease: "power3.out" 
          }
        );
        
        gsap.fromTo(".star-rating", 
          { scale: 0, rotation: 180 },
          { 
            scale: 1, 
            rotation: 0,
            duration: 0.5, 
            stagger: 0.1, 
            ease: "back.out(2)",
            delay: 0.5
          }
        );
      }
    });

    // Integration cards animation
    ScrollTrigger.create({
      trigger: integrationsRef.current,
      start: "top 80%",
      onEnter: () => {
        gsap.fromTo(".integration-card", 
          { y: 50, opacity: 0, scale: 0.8 },
          { 
            y: 0, 
            opacity: 1, 
            scale: 1,
            duration: 0.6, 
            stagger: 0.1, 
            ease: "back.out(1.4)" 
          }
        );
      }
    });

    // Hover animations for integration cards
    document.querySelectorAll('.integration-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { 
          scale: 1.1, 
          rotation: 5,
          duration: 0.3, 
          ease: "power2.out"
        });
        gsap.to(card.querySelector('.integration-icon'), {
          scale: 1.3,
          rotation: 360,
          duration: 0.5,
          ease: "power2.out"
        });
      });
      
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { 
          scale: 1, 
          rotation: 0,
          duration: 0.3, 
          ease: "power2.out"
        });
        gsap.to(card.querySelector('.integration-icon'), {
          scale: 1,
          rotation: 0,
          duration: 0.3,
          ease: "power2.out"
        });
      });
    });

    // CTA section animation
    ScrollTrigger.create({
      trigger: ctaRef.current,
      start: "top 85%",
      onEnter: () => {
        gsap.fromTo(".cta-content", 
          { y: 100, opacity: 0, scale: 0.9 },
          { 
            y: 0, 
            opacity: 1, 
            scale: 1,
            duration: 1, 
            ease: "power3.out" 
          }
        );
        
        gsap.fromTo(".cta-button", 
          { x: -50, opacity: 0 },
          { 
            x: 0, 
            opacity: 1,
            duration: 0.8, 
            stagger: 0.2, 
            ease: "power3.out",
            delay: 0.3
          }
        );
      }
    });

    // Button hover animations
    document.querySelectorAll('.animated-button').forEach(button => {
      button.addEventListener('mouseenter', () => {
        gsap.to(button, { 
          scale: 1.05, 
          duration: 0.2, 
          ease: "power2.out"
        });
        
        if (button.querySelector('.button-arrow')) {
          gsap.to(button.querySelector('.button-arrow'), {
            x: 5,
            duration: 0.2,
            ease: "power2.out"
          });
        }
      });
      
      button.addEventListener('mouseleave', () => {
        gsap.to(button, { 
          scale: 1, 
          duration: 0.2, 
          ease: "power2.out"
        });
        
        if (button.querySelector('.button-arrow')) {
          gsap.to(button.querySelector('.button-arrow'), {
            x: 0,
            duration: 0.2,
            ease: "power2.out"
          });
        }
      });
    });

    // Continuous floating animations
    gsap.to(".floating-1", {
      y: -20,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    });

    gsap.to(".floating-2", {
      y: -15,
      x: 10,
      duration: 5,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    });

    gsap.to(".floating-3", {
      rotation: 2,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: "power2.inOut"
    });

    // Parallax scrolling effect
    gsap.to(".parallax-bg", {
      yPercent: -50,
      ease: "none",
      scrollTrigger: {
        trigger: ".parallax-container",
        start: "top bottom",
        end: "bottom top",
        scrub: true
      }
    });
  };

  const handleSignIn = () => {
    navigate('/sign-in');
  };

  const handleSignUp = () => {
    navigate('/sign-up');
  };

  const capabilities = [
    {
      icon: <Shield className="w-8 h-8 text-emerald-600" />,
      title: "Enterprise Security",
      description: "Comprehensive security orchestration for large-scale enterprise environments"
    },
    {
      icon: <Globe className="w-8 h-8 text-blue-600" />,
      title: "Global Threat Intelligence",
      description: "Real-time threat intelligence from our worldwide network of security sensors"
    },
    {
      icon: <Users className="w-8 h-8 text-purple-600" />,
      title: "Collaborative Defense",
      description: "Team-based security workflows with automated incident response capabilities"
    }
  ];

  const industries = [
    {
      title: "Financial Services",
      description: "Regulatory compliance and advanced threat protection for banking institutions",
      color: "bg-emerald-50 border-emerald-200",
      growth: "+45%"
    },
    {
      title: "Healthcare Systems",
      description: "HIPAA-compliant security solutions protecting sensitive patient data",
      color: "bg-blue-50 border-blue-200",
      growth: "+67%"
    },
    {
      title: "Government Agencies",
      description: "High-security clearance environments with zero-trust architecture",
      color: "bg-purple-50 border-purple-200",
      growth: "+38%"
    },
    {
      title: "Technology Companies",
      description: "DevSecOps integration and continuous security monitoring for tech stacks",
      color: "bg-orange-50 border-orange-200",
      growth: "+52%"
    }
  ];

  const metrics = [
    { number: "500M+", label: "Events Analyzed Daily" },
    { number: "99.99%", label: "Platform Uptime" },
    { number: "< 100ms", label: "Threat Response" },
    { number: "150+", label: "Global Locations" }
  ];

  const testimonials = [
    {
      quote: "Katalyst transformed our security posture from reactive to proactive. The platform's intelligence is unmatched.",
      author: "Sarah Chen, CISO at TechCorp",
      company: "Fortune 500 Technology Company"
    },
    {
      quote: "Implementation was seamless, and the ROI was evident within the first quarter. Outstanding platform.",
      author: "Michael Rodriguez, IT Director",
      company: "Global Financial Services"
    }
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav ref={navRef} className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3 floating-1">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                <Image 
                  src={logo}
                  alt="Katalyst Logo" 
                  width={40} 
                  height={40} 
                  className="rounded-full"
                />
              </div>
              <Image
                src={logo_image}
                alt="Katalyst Logo"
                width={120}
                height={28}
              />
            </div>

            {/* CTA Button */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleSignIn}
                className="animated-button border-gray-900 border-2 text-gray-900 px-4 py-2 rounded-full hover:bg-gray-800 hover:text-white transition-colors"
              >
                Log-In
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white parallax-container relative overflow-hidden">
        <div className="parallax-bg absolute inset-0 bg-gradient-to-b from-blue-50/30 to-emerald-50/30"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="hero-title text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            The unified cybersecurity
            <br />
            platform for <span className="gradient-text floating-2">modern enterprises</span>
          </h1>
          <p className="hero-subtitle text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Katalyst delivers comprehensive threat detection, security orchestration, and 
            compliance management through a single, intelligent platform trusted by 
            industry leaders worldwide.
          </p>
          <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="button"
              onClick={handleSignUp}
              className="animated-button bg-gray-900 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-gray-800 transition-colors inline-flex items-center justify-center space-x-2"
            >
              Start Free Trial
              <ArrowRight className="button-arrow w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section ref={metricsRef} className="py-16 px-4 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((metric, index) => (
              <div key={index} className="metric-item text-center">
                <div className="metric-number text-3xl md:text-4xl font-bold text-gray-900 mb-2">{metric.number}</div>
                <div className="text-gray-600">{metric.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section ref={capabilitiesRef} id="platform" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 floating-3">
              Enterprise-grade security capabilities
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Built for organizations that require the highest levels of security, 
              compliance, and operational efficiency.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {capabilities.map((capability, index) => (
              <div key={index} className="capability-card bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300">
                <div className="capability-icon mb-4">{capability.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{capability.title}</h3>
                <p className="text-gray-600 leading-relaxed">{capability.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section ref={industriesRef} id="industries" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted across critical industries
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From financial services to healthcare, our platform adapts to meet 
              the unique security requirements of every industry.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {industries.map((industry, index) => (
              <div key={index} className={`industry-card p-6 rounded-xl border-2 ${industry.color} hover:shadow-md transition-all duration-300 relative`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{industry.title}</h3>
                  <div className="growth-badge flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                    <TrendingUp className="w-3 h-3" />
                    <span>{industry.growth}</span>
                  </div>
                </div>
                <p className="text-gray-600">{industry.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsRef} className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What security leaders say
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                <div className="mb-6">
                  <div className="flex text-yellow-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Award key={i} className="star-rating w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 text-lg leading-relaxed italic">&quot;{testimonial.quote}&quot;</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-gray-600 text-sm">{testimonial.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section ref={integrationsRef} className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Seamless integration ecosystem
            </h2>
            <p className="text-xl text-gray-600">
              Connect with your existing security stack through 300+ native integrations.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: "SIEM", hover: "hover:bg-red-300" },
              { name: "SOAR", hover: "hover:bg-blue-300" },
              { name: "EDR", hover: "hover:bg-green-300" },
              { name: "Cloud Security", hover: "hover:bg-yellow-300" },
              { name: "Network Monitoring", hover: "hover:bg-purple-300" },
              { name: "Identity Management", hover: "hover:bg-violet-300" },
              { name: "Compliance Tools", hover: "hover:bg-orange-300" },
              { name: "Threat Intel", hover: "hover:bg-emerald-300" },
            ].map((integration, index) => (
              <div
                key={index}
                className={`integration-card text-center p-6 border border-gray-200 rounded-xl transition-all duration-300 ${integration.hover} cursor-pointer`}
              >
                <Lock className="integration-icon w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="font-medium text-gray-900">{integration.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="cta-content">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to transform your security operations?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join 500+ enterprise customers who have modernized their cybersecurity 
              with Katalyst. Start your free trial today.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleSignUp}
              className="cta-button animated-button bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Start Free Trial
            </button>
           
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8  rounded-lg flex items-center justify-center">
                        <Image 
                          src={logo}
                          alt="Katalyst Logo"
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                </div>
                <Image
                  src={logo_image}
                        alt="Katalyst Logo"
                        width={120}
                        height={28}
                        className="h-7"
                        />

              </div>
              <p className="text-gray-600">
                Enterprise cybersecurity platform trusted by global organizations.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Solutions</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Threat Detection</a></li>
                <li><a href="#" className="hover:text-gray-900">Security Orchestration</a></li>
                <li><a href="#" className="hover:text-gray-900">Compliance Management</a></li>
                <li><a href="#" className="hover:text-gray-900">Incident Response</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Security Blog</a></li>
                <li><a href="#" className="hover:text-gray-900">Research Reports</a></li>
                <li><a href="#" className="hover:text-gray-900">Webinars</a></li>
                <li><a href="#" className="hover:text-gray-900">Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><a href="#" className="hover:text-gray-900">Leadership</a></li>
                <li><a href="#" className="hover:text-gray-900">Careers</a></li>
                <li><a href="#" className="hover:text-gray-900">Press Center</a></li>
                <li><a href="#" className="hover:text-gray-900">Contact Us</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-gray-600">
            <p>&copy; 2025 Katalyst Security Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .gradient-text {
          background: linear-gradient(135deg, #059669, #2563eb);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>
    </div>
  );
};

export default KatalystLandingPage;