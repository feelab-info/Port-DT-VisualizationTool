'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { ExternalLink, Building, Zap, Factory, Ship, Users, Globe, Euro, MapPin } from 'lucide-react';

export default function SHIFT2DCPage() {
  return (
    <DashboardLayout>
      <div className="mb-8 mt-3">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">SHIFT2DC Project</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Creating smarter, more efficient, and environmentally friendly energy infrastructures</p>
      </div>

      <div className="space-y-12">
        {/* Project Introduction */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center">
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              A <strong>Horizon Europe Project</strong> with substantial funding of over <strong>11 million euros</strong>, 
              transforming how DC solutions are used in power systems across Europe. This Port Digital Twin application 
              is part of the <strong>Port Demonstrator</strong> in Funchal, Madeira.
            </p>
          </div>
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="bg-green-500 dark:bg-green-600 p-3 rounded-lg">
                <Euro className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Project Funding</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">€11M+</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="bg-blue-500 dark:bg-blue-600 p-3 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Partners</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">33</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="bg-purple-500 dark:bg-purple-600 p-3 rounded-lg">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Countries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center mb-6">
            <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Project Overview
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Mission & Vision
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                The SHIFT2DC project transforms how DC solutions are used in power systems. The Horizon Europe Project includes 
                the expertise of <strong>thirty-three partners</strong> from <strong>twelve countries</strong>, 
                coordinated by the Portuguese Research & Innovation Institute INESC-ID.
              </p>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                We establish comprehensive guidelines and a roadmap for widespread DC application 
                in diverse energy scenarios, developing, testing, and demonstrating technical feasibility, 
                cost-benefit, life cycle, and environmental impact of proposed DC solutions across Europe.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Key Features
              </h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                  Top-down, application-agnostic approach
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                  Medium (MV) and low voltage (LV) DC solutions
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                  Comprehensive cost-benefit analysis
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                  Standardization and harmonization guidelines
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Demonstrators */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Four Key Demonstrators
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            DC solutions are evaluated across four diverse application areas across Germany, France, and Portugal
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Building,
                title: "Data Centers",
                description: "Energy-efficient DC infrastructure for modern data processing facilities",
                color: "bg-gray-500 dark:bg-gray-600"
              },
              {
                icon: Ship,
                title: "Ports",
                description: "Electrification and energy management solutions for maritime infrastructure",
                highlight: true,
                color: "bg-blue-500 dark:bg-blue-600"
              },
              {
                icon: Factory,
                title: "Industry",
                description: "Industrial applications with optimized DC power distribution systems",
                color: "bg-orange-500 dark:bg-orange-600"
              },
              {
                icon: Globe,
                title: "Buildings",
                description: "Smart building energy systems with integrated DC solutions",
                color: "bg-green-500 dark:bg-green-600"
              }
            ].map((demo, index) => (
              <div 
                key={index} 
                className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-6 transition-all hover:shadow-md ${
                  demo.highlight ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${demo.color}`}>
                  <demo.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${
                  demo.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {demo.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {demo.description}
                </p>
                {demo.highlight && (
                  <div className="mt-3 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300 font-medium">
                    Current Demonstrator
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Port Demonstrator Focus */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center mb-6">
            <div className="bg-blue-500 dark:bg-blue-600 p-3 rounded-lg mr-4">
              <Ship className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Port Demonstrator
              </h2>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">Funchal, Madeira Island, Portugal</span>
              </div>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Digital Twin Application
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                This application is part of the Port Demonstrator implemented in Funchal, Madeira Island, Portugal. 
                The demonstrator has two main objectives: studying DC potential in ports through a Digital Twin 
                of Funchal Port and analyzing user perspectives.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Port Infrastructure</h4>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400 text-sm">
                  <li>• Cruise ship terminals</li>
                  <li>• Ferry terminal (Madeira-Porto Santo connection)</li>
                  <li>• Warship terminal</li>
                  <li>• Yacht and small boat terminal</li>
                </ul>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Key Challenge</h4>
                <p className="text-amber-700 dark:text-amber-300 text-sm">
                  Complete port electrification for ship interconnection, contributing to IMO goals 
                  and 40% carbon emission reduction by 2030. Peak capacity: 4 tourism cruises 
                  with up to 10 MW consumption per large cruise ship.
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Four Use Cases
              </h3>
              
              <div className="space-y-4">
                {[
                  {
                    title: "DC Port Management",
                    description: "BESS battery-buffered charging strategies to mitigate ship connection impact"
                  },
                  {
                    title: "DC Port/Grid Coordination",
                    description: "Grid stabilization services including frequency, voltage support, and energy arbitrage"
                  },
                  {
                    title: "DC Microgrid",
                    description: "Islanded operation mode for improved reliability and resilience"
                  },
                  {
                    title: "Port as DC Energy Hub",
                    description: "Hydrogen systems integration with PV generation and energy storage"
                  }
                ].map((useCase, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2">
                      UC{index + 1}: {useCase.title}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {useCase.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Project Leadership & Methodology */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Project Partners */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-center mb-6">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Leadership & Partners
              </h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Demo Leadership
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm">
                    <strong>Demo Leader:</strong> ITI (Instituto Tecnológico de Informática)
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    <strong>Coordination:</strong> INESC-ID (Portuguese Research & Innovation Institute)
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Key Participants
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {['APRAM', 'INESC ID', 'EDP NEW', 'FINCANTIERI', 'CIRCE', 'EDF'].map((partner) => (
                    <div key={partner} className="bg-gray-50 dark:bg-gray-700 rounded px-3 py-2 text-center">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">{partner}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Methodology */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Implementation Phases
            </h2>
            
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-2">
                  Phase 1: Design
                </h3>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  Design of the DC distribution grid incorporating comprehensive analysis of current infrastructure.
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-400 mb-2">
                  Phase 2: Digital Twin
                </h3>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Development of port digital twin combining real equipment measurements with digital twins.
                </p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-400 mb-2">
                  Validation & KPIs
                </h3>
                <p className="text-purple-700 dark:text-purple-300 text-sm">
                  Comprehensive validation through detailed specification and KPI assessment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Contributing to a Sustainable Energy Future
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            The methodologies developed in the Portuguese Demo, particularly regarding user acceptance 
            and adoption of DC technologies, will be adopted and replicated across all four demonstrators.
          </p>
          <a
            href="https://shift2dc.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Visit SHIFT2DC Website
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
