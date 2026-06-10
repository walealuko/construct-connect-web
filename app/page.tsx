import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="px-6 py-16 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Build Better, <br />
          <span className="text-blue-800">Source Smarter.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          The ultimate marketplace for construction materials and expert artisans.
          Find everything you need for your building project in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/marketplace" className="px-8 py-4 bg-blue-800 text-white text-lg font-semibold rounded-lg hover:bg-blue-900">
            Explore Marketplace
          </Link>
          <Link href="/artisans" className="px-8 py-4 border-2 border-blue-800 text-blue-800 text-lg font-semibold rounded-lg hover:bg-blue-50">
            Find Artisans
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-12">Why Choose Construct Hub?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">🏗️</div>
              <h3 className="font-semibold text-lg mb-2">Quality Materials</h3>
              <p className="text-gray-600 text-sm">Source verified construction materials from trusted suppliers.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">🛠️</div>
              <h3 className="font-semibold text-lg mb-2">Expert Artisans</h3>
              <p className="text-gray-600 text-sm">Connect with skilled professionals for all your building needs.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="text-3xl mb-4">💳</div>
              <h3 className="font-semibold text-lg mb-2">Secure Payments</h3>
              <p className="text-gray-600 text-sm">Safe and transparent transactions for peace of mind.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t text-center text-gray-500 text-sm">
        <p>© 2024 Construct Hub. Building the future together.</p>
      </footer>
    </div>
  );
}
