import axios from 'axios';
import { toast } from 'sonner';

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export async function processPayment(amount: number, metadata: any) {
  return new Promise((resolve, reject) => {
    // 1. Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
    script.onload = async () => {
      try {
        // 2. Create order on backend
        const { data: order } = await axios.post('/api/payment/create-order', {
          amount,
          receipt: metadata.invoiceId || `receipt_${Date.now()}`,
          doctorId: metadata.doctorId
        });

        // 3. Open Razorpay Checkout
        const options = {
          key: metadata.razorpayKeyId, // Pubic key
          amount: order.amount,
          currency: order.currency,
          name: metadata.clinicName || "Kayra Homeo Care",
          description: metadata.description || "Consultation Fee",
          order_id: order.id,
          handler: async (response: RazorpayResponse) => {
            try {
              // 4. Verify payment on backend
              const { data: verifyData } = await axios.post('/api/payment/verify', {
                ...response,
                doctorId: metadata.doctorId
              });
              if (verifyData.status === 'ok') {
                toast.success('Payment Successful!');
                resolve(response);
              } else {
                toast.error('Payment verification failed');
                reject(new Error('Verification failed'));
              }
            } catch (err) {
              toast.error('Error verifying payment');
              reject(err);
            }
          },
          prefill: {
            name: metadata.patientName,
            email: metadata.patientEmail,
            contact: metadata.patientPhone
          },
          theme: {
            color: "#10b981" // emerald-600
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          toast.error(response.error.description);
          reject(new Error(response.error.description));
        });
        rzp.open();
      } catch (err) {
        toast.error('Failed to initiate payment');
        reject(err);
      }
    };
    document.body.appendChild(script);
  });
}
