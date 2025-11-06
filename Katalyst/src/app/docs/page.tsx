'use client'
import React, { useState } from 'react';
import { Download, ChevronRight, FileText } from 'lucide-react';
import Image from 'next/image';
import Logo from '@/app/images/Logo.png';
import Logo_name from '@/app/images/Logo_name.png';
export default function MLDocumentation() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState('introduction');

  const handleDownload = () => {
    const datasetUrl = 'your-dataset-url.csv';
    window.open(datasetUrl, '_blank');
  };

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeExamples = [
    {
      title: "Data Loading & Preprocessing",
      id: "preprocessing",
      code: `import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Load dataset
df = pd.read_csv('dataset.csv')

# Handle missing values
df.fillna(df.mean(), inplace=True)

# Split features and target
X = df.drop('target', axis=1)
y = df['target']

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Feature scaling
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)`
    },
    {
      title: "Model Training",
      id: "training",
      code: `from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# Initialize model
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42
)

# Train model
model.fit(X_train_scaled, y_train)

# Make predictions
y_pred = model.predict(X_test_scaled)

# Evaluate
accuracy = accuracy_score(y_test, y_pred)
print(f'Accuracy: {accuracy:.4f}')
print(classification_report(y_test, y_pred))`
    },
    {
      title: "Model Evaluation",
      id: "evaluation",
      code: `from sklearn.metrics import confusion_matrix, roc_auc_score
import matplotlib.pyplot as plt
import seaborn as sns

# Confusion Matrix
cm = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
plt.title('Confusion Matrix')
plt.ylabel('Actual')
plt.xlabel('Predicted')
plt.show()

# ROC-AUC Score
y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
roc_auc = roc_auc_score(y_test, y_pred_proba)
print(f'ROC-AUC Score: {roc_auc:.4f}')`
    }
  ];

  const navItems = [
    { id: 'quickstart', label: 'Quickstart', hasSubmenu: false },
    { id: 'introduction', label: 'Introduction', hasSubmenu: false },
    { id: 'dataset', label: 'Dataset Info', hasSubmenu: true },
    { id: 'preprocessing', label: 'Data Processing', hasSubmenu: true },
    { id: 'training', label: 'Model Training', hasSubmenu: true },
    { id: 'evaluation', label: 'Evaluation', hasSubmenu: true },
  ];

  const tocItems = [
    { id: 'introduction', label: 'Introduction' },
    { id: 'dataset', label: 'Dataset Information' },
    { id: 'preprocessing', label: 'Data Preprocessing' },
    { id: 'training', label: 'Model Training' },
    { id: 'evaluation', label: 'Model Evaluation' },
    { id: 'performance', label: 'Performance Metrics' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-gray-200">
      {/* Top Navigation */}
      <nav className="bg-neutral-900 border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
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
                         <div className="overflow-hidden">
                           <Image
                             src={Logo_name}
                             alt="Katalyst"
                             width={140}
                             height={28}
                           />
                         </div>
                       </div>
            <div className="flex gap-6">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Documentation</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">References</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
           
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 bg-neutral-900 border-r border-neutral-800 min-h-screen p-6">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full text-left px-4 py-2 rounded-lg flex items-center justify-between transition-colors ${
                  activeSection === item.id
                    ? 'bg-neutral-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                <span>{item.label}</span>
                {item.hasSubmenu && <ChevronRight className="w-4 h-4" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-12 py-8 max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Machine Learning Models</h1>
            <p className="text-xl text-gray-400">
              Comprehensive documentation for training and deploying ML models
            </p>
          </div>

          {/* Introduction Section */}
          <section id="introduction" className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Introduction</h2>
            <div className="border-t border-neutral-800 pt-6">
              <p className="text-gray-300 leading-relaxed mb-6">
                The Machine Learning Framework is a Python library designed to facilitate the development of ML models. 
                Models in a multi-model system can communicate with any, and all models in the system to solve problems, 
                execute tasks and transact.
              </p>
              
              <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-6 mb-6">
                <div className="flex gap-3">
                  <FileText className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-gray-300 mb-3">
                      Head over to the{' '}
                      <a href="#" className="text-blue-400 hover:underline">
                        dataset repository ↗
                      </a>{' '}
                      to download it and start developing your Models!
                    </p>
                    <p className="text-gray-400 text-sm">
                      Current version of the dataset is <span className="text-white font-semibold">v2.1.0</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Dataset Info Section */}
          <section id="dataset" className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Dataset Information</h2>
            <div className="border-t border-neutral-800 pt-6">
              <p className="text-gray-300 leading-relaxed mb-6">
                The dataset contains comprehensive features for training machine learning models. It includes preprocessed 
                data with balanced classes and normalized features ready for model training.
              </p>

              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <p className="text-gray-400 text-sm mb-2">Total Samples</p>
                  <p className="text-3xl font-bold text-white">10,000</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <p className="text-gray-400 text-sm mb-2">Features</p>
                  <p className="text-3xl font-bold text-white">25</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                  <p className="text-gray-400 text-sm mb-2">Classes</p>
                  <p className="text-3xl font-bold text-white">2</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                At the simplest level, the dataset structure works as follows:
              </p>
            </div>
          </section>

          {/* Code Examples */}
          {codeExamples.map((example, index) => (
            <section key={example.id} id={example.id} className="mb-12">
              <h2 className="text-3xl font-bold text-white mb-6">{example.title}</h2>
              <div className="border-t border-neutral-800 pt-6">
                <div className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                  <div className="bg-neutral-950 px-4 py-3 flex justify-between items-center border-b border-neutral-800">
                    <span className="text-gray-400 text-sm font-mono">Python</span>
                    <button
                      onClick={() => copyCode(example.code, index)}
                      className="text-gray-400 hover:text-white text-sm px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
                    >
                      {copiedIndex === index ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="p-6 overflow-x-auto">
                    <code className="text-sm text-gray-300 font-mono leading-relaxed">
                      {example.code}
                    </code>
                  </pre>
                </div>
              </div>
            </section>
          ))}

          {/* Performance Section */}
          <section id="performance" className="mb-12">
            <h2 className="text-3xl font-bold text-white mb-6">Performance Metrics</h2>
            <div className="border-t border-neutral-800 pt-6">
              <div className="bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Metric</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-800">
                      <td className="py-4 px-6 text-gray-400">Accuracy</td>
                      <td className="py-4 px-6 text-white font-semibold">95.2%</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-4 px-6 text-gray-400">Precision</td>
                      <td className="py-4 px-6 text-white font-semibold">94.8%</td>
                    </tr>
                    <tr className="border-b border-neutral-800">
                      <td className="py-4 px-6 text-gray-400">Recall</td>
                      <td className="py-4 px-6 text-white font-semibold">95.6%</td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-gray-400">F1 Score</td>
                      <td className="py-4 px-6 text-white font-semibold">95.2%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>

        {/* Right Sidebar - Table of Contents */}
        <aside className="w-64 p-6 border-l border-neutral-800">
          <div className="sticky top-6">
            <h3 className="text-white font-semibold mb-4">On This Page</h3>
            <nav className="space-y-2">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block text-gray-400 hover:text-white text-sm transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            
            <div className="mt-8 pt-8 border-t border-neutral-800">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Dataset
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-800 space-y-2">
              <a href="#" className="block text-gray-400 hover:text-white text-sm transition-colors">
                Question? Give us feedback
              </a>
              <a href="#" className="block text-gray-400 hover:text-white text-sm transition-colors">
                Edit this page on GitHub
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}