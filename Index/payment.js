const stripe = Stripe('pk_test_51RDXoyIh38caaVawG2iWv51O3BZgRTbiSc7GrYORKyBNmqWuACvRs2jF4aTTsqFTQFwGP8tDHoWudkBghHn5bzwO00EmYz41OK'); // Replace with your Stripe public key

const createCheckoutSession = () => {
  return fetch('/create-checkout-session', {
    method: 'POST',
  })
  .then(response => response.json())
  .then(session => {
    return stripe.redirectToCheckout({ sessionId: session.id });
  })
  .catch(error => {
    console.error('Error:', error);
  });
};

export { createCheckoutSession };