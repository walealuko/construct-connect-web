import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="text-xl font-bold text-green-700">TaxHub Nigeria</div>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 text-gray-700 hover:text-green-700">Login</Link>
          <Link href="/register" className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Tax Done Right.<br />
          <span className="text-green-700">No Stress.</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          The simple way for Nigerian individuals and small businesses to calculate taxes,
          prepare FIRS-ready forms, and stay compliant — all in your language.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register" className="px-8 py-4 bg-green-700 text-white text-lg font-semibold rounded-lg hover:bg-green-800">
            Start Free Today
          </Link>
          <Link href="#how-it-works" className="px-8 py-4 border-2 border-green-700 text-green-700 text-lg font-semibold rounded-lg hover:bg-green-50">
            See How It Works
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">No credit card required. Cancel anytime.</p>
      </section>

      {/* Problem/Solution Section */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Tax Doesn't Have to Be Hard</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-semibold text-red-600 mb-3">Before TaxHub</h3>
              <ul className="space-y-2 text-gray-600">
                <li>✗ Confusing tax forms</li>
                <li>✗ Don't know what you owe</li>
                <li>✗ Fear of penalties from FIRS</li>
                <li>✗ Expensive accountant just to file</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-2 border-green-200">
              <h3 className="font-semibold text-green-700 mb-3">With TaxHub</h3>
              <ul className="space-y-2 text-gray-600">
                <li>✓ Simple step-by-step guide</li>
                <li>✓ Instant tax calculation</li>
                <li>✓ Download ready-to-submit forms</li>
                <li>✓ Pay what you need, when you need</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">How TaxHub Works</h2>
          <div className="space-y-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold shrink-0">1</div>
              <div>
                <h3 className="font-semibold text-lg">Add Your Income</h3>
                <p className="text-gray-600">Enter all money you received — salary, freelance, rental, business sales. No jargon.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold shrink-0">2</div>
              <div>
                <h3 className="font-semibold text-lg">Add Your Expenses</h3>
                <p className="text-gray-600">Record business expenses — we'll calculate what's deductible automatically.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold shrink-0">3</div>
              <div>
                <h3 className="font-semibold text-lg">Get Your Tax Figure</h3>
                <p className="text-gray-600">We calculate exactly what you owe — PAYE, CIT, VAT, WHT — and generate your FIRS-ready form.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold shrink-0">4</div>
              <div>
                <h3 className="font-semibold text-lg">Download & Submit</h3>
                <p className="text-gray-600">Download your completed form and submit to FIRS yourself — or let us guide you.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-green-50 px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Simple, Honest Pricing</h2>
          <p className="text-gray-600 mb-8">One yearly fee. No hidden charges.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-xl mx-auto">
            {/* Individual */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold mb-2">Individual</h3>
              <p className="text-gray-600 mb-4">For freelancers, market traders, employees, contractors</p>
              <div className="text-4xl font-bold text-green-700 mb-1">₦60,000</div>
              <p className="text-sm text-gray-500 mb-4">per year</p>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> PAYE calculator</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Income & expense tracking</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> FIRS form preparation</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Annual tax summary</li>
              </ul>
              <Link href="/register?tier=individual" className="block w-full py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 font-semibold">
                Start Free Trial
              </Link>
            </div>
            {/* Business */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-green-600">
              <div className="text-green-700 text-sm font-semibold mb-1">MOST POPULAR</div>
              <h3 className="text-xl font-semibold mb-2">Business</h3>
              <p className="text-gray-600 mb-4">For hotels, shops, small businesses, SMEs</p>
              <div className="text-4xl font-bold text-green-700 mb-1">₦1,000,000</div>
              <p className="text-sm text-gray-500 mb-4">per year</p>
              <ul className="text-left space-y-2 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> All Individual features</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> CIT & VAT calculators</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Multiple employees support</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> Priority support</li>
                <li className="flex items-center gap-2"><span className="text-green-600">✓</span> CAC registration support</li>
              </ul>
              <Link href="/register?tier=business" className="block w-full py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 font-semibold">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Common Questions</h2>
          <div className="space-y-4">
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="font-semibold cursor-pointer">Do I need to be registered with FIRS?</summary>
              <p className="mt-2 text-gray-600">Not necessarily. TaxHub helps you understand your tax position and prepares forms. If you're not registered, we can guide you on registration.</p>
            </details>
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="font-semibold cursor-pointer">How does the free trial work?</summary>
              <p className="mt-2 text-gray-600">You get full access for 14 days. Add income, calculate taxes, generate forms — all free. No payment required to start.</p>
            </details>
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="font-semibold cursor-pointer">Can I cancel anytime?</summary>
              <p className="mt-2 text-gray-600">Yes. Yearly subscription, cancel whenever. No refunds after 30 days.</p>
            </details>
            <details className="bg-gray-50 rounded-lg p-4">
              <summary className="font-semibold cursor-pointer">Is my data safe?</summary>
              <p className="mt-2 text-gray-600">Yes. Your data is encrypted and stored securely. We never share your information.</p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-green-700 text-white px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Get Your Taxes Right?</h2>
        <p className="text-green-100 mb-8 max-w-xl mx-auto">Join thousands of Nigerians who trust TaxHub to manage their taxes simply.</p>
        <Link href="/register" className="inline-block px-8 py-4 bg-white text-green-700 text-lg font-semibold rounded-lg hover:bg-green-50">
          Start Your Free Trial Now
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t text-center text-gray-500 text-sm">
        <p>© 2024 TaxHub Nigeria. Built for Nigerian businesses.</p>
        <p className="mt-2">Questions? Email hello@taxhub.ng</p>
      </footer>
    </div>
  );
}