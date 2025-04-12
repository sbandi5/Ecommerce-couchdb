const stripe = Stripe('5Kjv0FeJleVhmcBlvHyrv58ND0ysVXae0NEdN5xXrLut9DlSUSJtZrQV730Z7rWLMdBNsf7eVwmiXaltw006h4Vyev4'); // Replace with your Stripe public key

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