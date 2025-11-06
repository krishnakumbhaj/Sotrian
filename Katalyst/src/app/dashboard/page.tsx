'use client';
import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { User, Mail, LogOut, ChevronDown, Menu, X,ArrowRight } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import Logo from '@/app/images/Logo.png';
import Logo_image from '@/app/images/Logo_name.png';
import Logo_name_ai from '@/app/images/Chat-logo-name.png';
import Logo_ai from '@/app/images/chat-logo.png';
import Image from 'next/image';
import Link from 'next/link';
import Video_frame from '@/components/dash-compo/video-frame';
import About from '@/components/dash-compo/about';
import Features from '@/components/dash-compo/features';
import Model from '@/components/dash-compo/model';
import * as THREE from 'three';
// Register GSAP plugins
gsap.registerPlugin(ScrollToPlugin);
gsap.registerPlugin(ScrollTrigger);

const FraudDetectionPage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const logoNameRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const lastScrollState = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const animationFrameRef = useRef<number | null>(null);
  
  const handleLogout = () => {
    signOut({ callbackUrl: '/sign-in' });
  };

useEffect(() => {
  if (!containerRef.current) return;

  // Scene setup
  const scene = new THREE.Scene();
  scene.background = null;
  sceneRef.current = scene;

  // Camera
  const camera = new THREE.PerspectiveCamera(
    50,
    containerRef.current.clientWidth / containerRef.current.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 8;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  containerRef.current.appendChild(renderer.domElement);

  // Create icosahedron (20-sided polyhedron similar to your logo)
  const geometry = new THREE.IcosahedronGeometry(2.5, 0);
  
  // Soft blue gradient material
  const material = new THREE.MeshStandardMaterial({
    color: 0x3699ea,
    roughness: 0.3,
    metalness: 0.2,
    emissive: 0x2b7fd9,
    emissiveIntensity: 0.15,
    flatShading: true
  });

  const icosahedron = new THREE.Mesh(geometry, material);
  scene.add(icosahedron);

  // Create edge lines for the geometric look
  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const edgesMaterial = new THREE.LineBasicMaterial({ 
    color: 0xffffff, 
    linewidth: 2,
    opacity: 0.9,
    transparent: true
  });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  icosahedron.add(edges);

  // Add subtle glow effect with another layer
  const glowGeometry = new THREE.IcosahedronGeometry(2.6, 0);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x6bb3ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  icosahedron.add(glow);

  // Soft, ambient lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight1.position.set(5, 5, 5);
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xadd8ff, 0.4);
  directionalLight2.position.set(-5, -3, -5);
  scene.add(directionalLight2);

  const pointLight = new THREE.PointLight(0x3699ea, 0.6, 20);
  pointLight.position.set(0, 5, 5);
  scene.add(pointLight);

  // Animation
  let time = 0;
  const animate = () => {
    time += 0.008;

    // Smooth, slow rotation
    icosahedron.rotation.y = time * 0.3;
    icosahedron.rotation.x = time * 0.15;

    // Subtle pulsing
    const scale = 1 + Math.sin(time * 1.5) * 0.03;
    icosahedron.scale.setScalar(scale);

    renderer.render(scene, camera);
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  animate();

  // Handle resize
  const handleResize = () => {
    if (!containerRef.current) return;
    
    camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
  };

  window.addEventListener('resize', handleResize);

  // Mouse interaction
  let mouseX = 0;
  let mouseY = 0;

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Gentle rotation based on mouse
    icosahedron.rotation.y = time * 0.3 + mouseX * 0.5;
    icosahedron.rotation.x = time * 0.15 + mouseY * 0.5;
  };

  const container = containerRef.current;
  if (container) {
    container.addEventListener('mousemove', handleMouseMove);
  }

  // Scroll handler for logo animation
  const handleScroll = () => {
    const scrollPosition = window.scrollY;
    const shouldHide = scrollPosition > 0;
    
    if (shouldHide !== lastScrollState.current && logoNameRef.current) {
      lastScrollState.current = shouldHide;
      
      if (shouldHide) {
        gsap.to(logoNameRef.current, {
          x: -150,
          scale: 0,
          opacity: 0,
          duration: 0.2,
          ease: "power4.in"
        });
      } else {
        gsap.to(logoNameRef.current, {
          x: 0,
          scale: 1,
          opacity: 1,
          duration: 0.2,
          ease: "power4.out"
        });
      }
    }
  };

  window.addEventListener('scroll', handleScroll);
  
  // Hero animation
  gsap.fromTo(heroRef.current, 
    { opacity: 0, y: 50 },
    { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }
  );

  // Rotate the network illustration like a globe (3D rotation) with contained size
  gsap.to(".network-illustration", {
    rotationY: 360,
    duration: 20,
    repeat: -1,
    ease: "none",
    force3D: true
  });

  // Floating background elements
  gsap.to(".floating-shape", {
    y: "random(-20, 20)",
    x: "random(-20, 20)",
    rotation: "random(-180, 180)",
    duration: 4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    stagger: 0.5
  });

  // Module cards animation
  gsap.fromTo(".module-card",
    { opacity: 0, y: 60, scale: 0.8 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.8,
      stagger: 0.2,
      ease: "back.out(1.7)",
      scrollTrigger: {
        trigger: ".modules-grid",
        start: "top 80%",
        end: "bottom 20%",
        toggleActions: "play none none reverse"
      }
    }
  );

  // Stats counter animation
  gsap.fromTo(".stat-number",
    { textContent: 0 },
    {
      textContent: (i: number, target: HTMLElement) => target.getAttribute('data-count'),
      duration: 2,
      ease: "power2.out",
      snap: { textContent: 1 },
      scrollTrigger: {
        trigger: statsRef.current,
        start: "top 80%"
      }
    }
  );

  // Cleanup
  return () => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const container = containerRef.current;
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('scroll', handleScroll);
    if (container) {
      container.removeEventListener('mousemove', handleMouseMove);
      // Cleanup renderer within the same condition block
      if (renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    renderer.dispose();
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  };
}, []);

  // Smooth scroll function
  const smoothScrollTo = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      gsap.to(window, {
        duration: 1.5,
        scrollTo: { y: target, offsetY: 80 },
        ease: "power3.inOut"
      });
    }
    setMobileMenuOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Individual fraud detection modules (kept for reference)
  // const modules = [
  //   {
  //     title: "UPI Fraud Detection",
  //     description: "Advanced real-time analysis of UPI transactions using ML algorithms to detect suspicious patterns in frequency, location, and timing.",
  //     icon: "💳",
  //     color: "from-blue-500 to-cyan-500",
  //     link: "https://upi-fraud.streamlit.app/"
  //   },
  //   {
  //     title: "URL Phishing Detection",
  //     description: "Intelligent URL scanning system that analyzes lexical and structural patterns to identify malicious websites and phishing attempts.",
  //     icon: "🔗",
  //     color: "from-purple-500 to-pink-500",
  //     link: "https://urlfrauddetection-xbq5iysry7sagmrgcgxjun.streamlit.app/"
  //   },
  //   {
  //     title: "Email Scam Detection",
  //     description: "NLP-powered email analysis that detects phishing attempts, spam, and fraudulent communications with high accuracy.",
  //     icon: "📧",
  //     color: "from-green-500 to-teal-500",
  //     link: "https://emailsspamclassifier-it5fguhpkibhxxgmz8hp8c.streamlit.app/"
  //   },
  //   {
  //     title: "Credit Card Fraud Detection",
  //     description: "Time-series analysis of credit card transactions to identify anomalies in spending patterns, amounts, and merchant data.",
  //     icon: "💎",
  //     color: "from-orange-500 to-red-500",
  //     link: "https://creditcardfrauddetection-b7fkeczq8hexc4ovqebueb.streamlit.app/"
  //   }
  // ];

  // const stats = [
  //   { number: 99.8, label: "Detection Accuracy", suffix: "%" },
  //   { number: 50000, label: "Threats Blocked", suffix: "+" },
  //   { number: 24, label: "Real-time Monitoring", suffix: "/7" },
  //   { number: 4, label: "AI Models", suffix: "" }
  // ];

  return (
    <div className=" bg-[#f0eee6]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-[#f0eee6] z-50  ">
        <div className="max-w-full mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-24">
            {/* Logo - Far Left */}
            <div className="flex items-center space-x-1 flex-shrink-0">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center">
                <Image 
                  src={Logo}
                  alt="Katalyst Logo" 
                  width={45} 
                  height={45} 
                  className="rounded-full"
                />
              </div>
              <div ref={logoNameRef} className="overflow-hidden">
                <Image
                  src={Logo_image}
                  alt="Katalyst"
                  width={140}
                  height={28}
                />
              </div>
            </div>

            {/* All Navigation Items - Far Right */}
            <div className="flex items-center space-x-6">
              {/* Desktop Navigation Links */}
              <div className="hidden md:flex items-center space-x-6">
                <button 
                  onClick={() => smoothScrollTo('features')}
                  className="text-zinc-950 hover:text-zinc-800 transition-colors duration-200 text-2xl   focus:outline-none"
                >
                  Features
                </button>
                <button 
                  onClick={() => smoothScrollTo('modules')}
                  className="text-zinc-950 hover:text-zinc-800 transition-colors duration-200 text-2xl  focus:outline-none"
                >
                  Modules
                </button>
                <button 
                  onClick={() => smoothScrollTo('stats')}
                  className="text-zinc-950 hover:text-zinc-800 transition-colors duration-200 text-2xl  focus:outline-none"
                >
                  Statistics
                </button>
              </div>

              {/* Try Katalyst Button + User Dropdown (Connected) */}
              <div className="hidden md:flex items-center bg-teal-800 rounded-2xl">
                <Link
                  href="/Sotrian.ai"
                  className="px-5 py-4 flex items-center space-x-1 text-white text-lg font-medium hover:bg-teal-900 hover:rounded-l-2xl transition-colors duration-200 focus:outline-none rounded-l-2xl"
                >
                  <span className='font-bold italic'>
                    <Image
                      src={Logo_ai}
                      alt="Sotrian AI"
                      width={30}
                      height={30}
                    />
                  </span>
                  <span>
                    <Image 
                      src={Logo_name_ai}
                      alt="Sotrian Logo"
                      width={70}
                      height={70}
                    />
                  </span>
                </Link>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-1 px-6 py-4 text-white  transition-all duration-200 focus:outline-none rounded-r-lg border-l border-teal-800"
                  >
                   
                    <ChevronDown 
                      className={`w-6 h-6 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#f0eee6] rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                    {/* User Info Section */}
                    <div className="px-3 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {session?.user?.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {session?.user?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>Email Settings</span>
                      </button>
                      
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button 
                          onClick={handleLogout} 
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center space-x-3"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="font-medium">Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

                {/* Mobile Hamburger Menu */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none"
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5 text-gray-700" />
                  ) : (
                    <Menu className="w-5 h-5 text-gray-700" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-1">
              <button 
                onClick={() => smoothScrollTo('features')}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 text-xl font-medium"
              >
                Features
              </button>
              <button 
                onClick={() => smoothScrollTo('modules')}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 text-xl font-medium"
              >
                Modules
              </button>
              <button 
                onClick={() => smoothScrollTo('stats')}
                className="block w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200 text-xl font-medium"
              >
                Statistics
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16"></div>


     {/* Hero Section */}
      {/* Hero Section - Add this after the spacer div */}
<section ref={heroRef} className="min-h-[calc(100vh-120px)] px-4 flex items-center">
  <div className="max-w-7xl mx-auto w-full">
    <div className="grid md:grid-cols-2 gap-12 items-center">
      {/* Left Content */}
      <div className="space-y-8 mt-20">
        <h1 className="text-7xl md:text-5xl lg:text-7xl font-bold text-gray-900 leading-tight">
          AI <span className="underline decoration-4 decoration-[#90a8e4]">research</span> and{' '}
          <span className="underline decoration-4 decoration-[#90a8e4]">products</span> that put frontier
        </h1>
        <p className="text-xl md:text-2xl text-gray-700 leading-relaxed max-w-2xl">
          AI will have a vast impact on the world. Sotrian is a public benefit corporation dedicated to securing its benefits and mitigating its risks.
        </p>
      </div>

      {/* Right - 3D Illustration */}
      {/* <div className="flex justify-center items-center"> */}
        <div 
          ref={containerRef} 
          className="w-full h-[500px] bg-[#f0eee6] rounded-3xl"
          style={{ touchAction: 'none' }}
        />
      </div>
    {/* </div> */}
  </div>
</section>

      {/* Features Overview */}
  <section className="py-20 px-4 bg-[#f0eee6]">
      <div className="px-16 mx-auto">
        <div className="bg-[#e3dacc] rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-baseline">
            {/* Left Content */}
            <div>
              <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6">
                Sotrian Orion-Pax
              </h2>
              <p className="text-xl md:text-2xl text-gray-700 mb-24">
                Introducing the best model in the world for agents, coding, and computer use.
              </p>
              <button className="bg-teal-800 text-lg text-white px-9 py-5 rounded-3xl font-medium hover:bg-teal-900 transition-colors duration-300">
                 read announcement
              </button>
            </div>

            {/* Right Content - Learn More Links */}
            <div className="space-y-2 mt-0">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                Learn more
              </h3>
              
              <a 
                href="#" 
                className="group flex items-center justify-between p-4 border-b border-zinc-900 transition-all duration-300"
              >
                <span className="text-3xl font-medium text-gray-900">
                  Managing context on the Sotrian Developer Platform
                </span>
                               <ArrowRight className="w-10 h-10 text-gray-900 group-hover:translate-x-1 transition-transform duration-300" />

              </a>

              <a 
                href="#" 
                className="group flex items-center justify-between p-4 border-b border-zinc-900 transition-all duration-300"
              >
                <span className="text-3xl font-medium text-gray-900">
                  Enabling Sotrian Code to work more autonomously
                </span>
                               <ArrowRight className="w-10 h-10 text-gray-900 group-hover:translate-x-1 transition-transform duration-300" />

              </a>

              <a 
                href="#" 
                className="group flex items-center justify-between p-4 border-b border-zinc-900 transition-all duration-300"
              >
                <span className="text-3xl font-medium text-gray-900">
                  Model details
                </span>
                <ArrowRight className="w-8 h-8 text-gray-900 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>


      <Video_frame />

     
          <div className="border-b-2 border-black mt-9 mx-20"></div>
      
       <About/>
       <Model/>
       <Features/>
      {/* How It Works */}
     <div className="mt-4 bg-[#f0eee6] flex items-center justify-center p-8 mb-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-black mb-12 leading-tight">
          Want to help us build<br />
          the future of safe AI?
        </h1>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="bg-teal-800 text-white px-8 py-4 rounded-2xl text-lg font-medium hover:bg-teal-900 transition-colors">
            See Docs
          </button>
          
          <button className="bg-transparent text-teal-800 border-2 border-teal-800 px-8 py-4 rounded-2xl text-lg font-medium hover:bg-teal-800 hover:text-white transition-colors">
            Speak with sales
          </button>
        </div>
      </div>
    </div>

      {/* Footer */}
      <footer className="py-16 px-4 bg-[#141413] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <Image 
                    src={Logo}
                    alt="FraudDetect AI Logo"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                </div>
                <Image
                  src={Logo_image}
                  alt="FraudDetect AI Logo"
                  width={120}
                  height={28}
                  className="h-7"
                />
              </div>
              <p className="text-gray-400">
                Advanced multi-model fraud detection system powered by machine learning and artificial intelligence.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Detection Modules</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">UPI Fraud Detection</a></li>
                <li><a href="#" className="hover:text-white transition-colors">URL Phishing Scanner</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Email Scam Detection</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Credit Card Fraud</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Technology</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Machine Learning</li>
                <li>Natural Language Processing</li>
                <li>Time Series Analysis</li>
                <li>Pattern Recognition</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Email: contact@frauddetect.ai</li>
                <li>Support: help@frauddetect.ai</li>
                <li>Security: security@frauddetect.ai</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 FraudDetect AI. All rights reserved. Built with Next.js and powered by advanced ML algorithms.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FraudDetectionPage;