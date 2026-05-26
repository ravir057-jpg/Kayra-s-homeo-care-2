import { useState } from 'react';
import { CreditCard, Check, Zap, Shield, Calendar, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../../lib/i18n';
import { auth, db } from '../../lib/db';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { UserProfile } from '../../types';

interface SubscriptionManagerProps {
  profile: UserProfile | null;
}

export default function SubscriptionManager({ profile }: SubscriptionManagerProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const PLANS = [
    {
      id: 'basic',
      name: 'Basic Clinic',
      price: '₹200',
      amount: 200,
      period: 'month',
      durationMonths: 1,
      description: 'Essential digital tools for small homeopathy clinics to manage patients and prescriptions.',
      features: ['Digital Prescriptions', 'Up to 500 Patients', 'WhatsApp Notifications', 'Cloud Data Backup', 'Basic Billing'],
      color: 'blue'
    },
    {
      id: 'pro',
      name: 'Pro Practice',
      price: '₹1,000',
      amount: 1000,
      period: '6 months',
      durationMonths: 6,
      popular: true,
      description: 'Advanced features including inventory and analytics for growing professional practices.',
      features: ['Everything in Basic', 'Unlimited Patients', 'Inventory Management', 'Advanced AI Insights', 'Clinical Analytics', 'Video Consultations'],
      color: 'indigo'
    },
    {
      id: 'yearly',
      name: 'Elite Yearly',
      price: '₹2,500',
      amount: 2500,
      period: 'year',
      durationMonths: 12,
      benefit: '2 Months Free',
      description: 'Best value for established practitioners with full support and custom branding options.',
      features: ['Everything in Pro', 'Priority 24/7 Support', 'Custom Clinic Branding', 'Advanced Data Export', 'Dedicated Account Manager', 'Annual Savings (2 Months Free)'],
      color: 'emerald'
    }
  ];

  const handleSubscription = async (plan: any) => {
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_SiCbWfvgfN5jDp"; // Fallback for dev

    if (!auth.currentUser) {
      toast.error('You must be logged in to subscribe.');
      return;
    }

    setLoading(true);

    const loadRazorpay = () => {
      return new Promise((resolve) => {
        if ((window as any).Razorpay) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.id = 'razorpay-sdk';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    const res = await loadRazorpay();

    if (!res) {
      toast.error('Razorpay SDK failed to load. Check your internet connection.');
      setLoading(false);
      return;
    }

    const options = {
      key: keyId,
      amount: plan.amount * 100,
      currency: 'INR',
      name: "Kayra's Homeo Care",
      description: `Subscription for ${plan.name}`,
      image: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png',
      handler: async function (response: any) {
        try {
          // Success: Update the subscription in Firestore
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + plan.durationMonths);

          await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
            subscription: plan.id,
            subscriptionExpiry: expiryDate.toISOString(),
            razorpayPaymentId: response.razorpay_payment_id
          });

          toast.success(`Payment Successful! Your subscription is now ${plan.name}.`);
          setLoading(false);
          // Wait a bit for Firestore sync and reload or just rely on parent refresh
          setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
          console.error("Payment error:", error);
          toast.error('Failed to update subscription status. Please contact support.');
          setLoading(false);
        }
      },
      prefill: {
        name: auth.currentUser?.displayName || 'Doctor',
        email: auth.currentUser?.email || '',
      },
      theme: {
        color: '#4f46e5',
      },
      modal: {
        ondismiss: function() {
          setLoading(false);
        }
      }
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();
  };

  const activePlanId = profile?.subscription;
  const currentPlan = PLANS.find(p => p.id === activePlanId);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('subscription')}</h2>
          <p className="text-sm text-slate-500">Manage your clinical platform subscription and licensing</p>
        </div>
        {currentPlan && (
          <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">{t('active_plan')}: {currentPlan.name}</span>
          </div>
        )}
      </div>

      {/* Subscription Alert */}
      {profile?.subscriptionExpiry && currentPlan && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Subscription Renewal</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Your {currentPlan.name} expires on {new Date(profile.subscriptionExpiry).toLocaleDateString()}. 
              Please renew to avoid interruption of AI services.
            </p>
          </div>
          <button 
            onClick={() => handleSubscription(currentPlan)}
            className="ml-auto px-4 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-sm"
          >
            {t('renew_now')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <motion.div 
            key={plan.id}
            whileHover={{ y: -5 }}
            className={`bg-white rounded-3xl border-2 p-6 flex flex-col relative overflow-hidden transition-all ${
              plan.popular ? 'border-indigo-500 shadow-xl shadow-indigo-100' : 'border-slate-200 hover:border-slate-300'
            } ${profile?.subscription === plan.id ? 'border-emerald-500 ring-2 ring-emerald-100' : ''}`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-brand-600 text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl uppercase tracking-widest">
                RECOMMENDED
              </div>
            )}
            
            <div className="flex justify-between items-start mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                plan.color === 'blue' ? 'bg-indigo-50 text-indigo-600' : 
                plan.color === 'emerald' ? 'bg-brand-50 text-brand-600' : 'bg-brand-50 text-brand-600'
              }`}>
                {plan.id === 'basic' ? <Shield size={24} /> : plan.id === 'pro' ? <Zap size={24} /> : <CreditCard size={24} />}
              </div>
              {plan.benefit && (
                <span className="bg-brand-50 text-brand-600 text-[10px] font-bold px-2 py-1 rounded-lg border border-brand-100 shadow-sm">
                  {plan.benefit}
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{plan.description}</p>
            
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
              <span className="text-xs text-slate-400 font-medium">/ {plan.period}</span>
            </div>

            <div className="my-8 space-y-3 flex-grow">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="mt-1 w-4 h-4 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                    <Check size={10} strokeWidth={4} />
                  </div>
                  <span className="text-xs text-slate-600 font-medium leading-relaxed">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleSubscription(plan)}
              disabled={loading || profile?.subscription === plan.id}
              className={`w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                profile?.subscription === plan.id 
                  ? 'bg-brand-600 text-white cursor-default' 
                  : plan.popular 
                    ? 'bg-brand-600 text-white hover:bg-slate-900 shadow-xl shadow-brand-100' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-sm'
              }`}
            >
              {loading ? <Clock size={18} className="animate-spin" /> : (
                <>
                  <CreditCard size={18} />
                  {profile?.subscription === plan.id ? 'Active Plan' : 'Select Plan'}
                </>
              )}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Need a Custom Enterprise Solution?</h3>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8">
            Tailored solutions for large hospitals, clinical chains, and health research organizations with custom security and data sovereignty requirements.
          </p>
          <button className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-95 shadow-xl shadow-white/10">
            Contact Enterprise Sales
          </button>
        </div>
      </div>
    </div>
  );
}
