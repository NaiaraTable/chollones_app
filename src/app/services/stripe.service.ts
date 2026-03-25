import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StripeService {
  private stripe: any = null;
  private elements: any = null;
  private stripePublicKey = environment.stripePublicKey;

  constructor() {
    this.cargarStripe();
  }

  // Cargar Stripe.js dinámicamente
  private cargarStripe(): void {
    if ((window as any).Stripe) {
      this.stripe = (window as any).Stripe(this.stripePublicKey);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      this.stripe = (window as any).Stripe(this.stripePublicKey);
    };
    document.body.appendChild(script);
  }

  // Crear Payment Intent
  async crearPaymentIntent(articulos: any[], total: number): Promise<any> {
    try {
      // Llamar al endpoint PHP que crea el intent
      const response = await fetch('/api/procesar-pago.php?action=crear-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('chollones_token') || ''}`
        },
        body: JSON.stringify({ articulos, total })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error creando intent');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en crearPaymentIntent:', error);
      throw error;
    }
  }

  // Confirmar pago después de que Stripe lo procesa
  async confirmarPago(stripeIntentId: string, articulos: any[], total: number): Promise<any> {
    try {
      const token = localStorage.getItem('chollones_token');
      const response = await fetch('/api/procesar-pago.php?action=confirmar-pago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          stripe_intent_id: stripeIntentId,
          articulos,
          total
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error confirmando pago');
      }

      return await response.json();
    } catch (error) {
      console.error('Error en confirmarPago:', error);
      throw error;
    }
  }

  // Obtener instancia de Stripe
  getStripe(): any {
    return this.stripe;
  }

  // Esperar a que Stripe esté cargado
  async esperarStripe(): Promise<any> {
    let intentos = 0;
    while (!this.stripe && intentos < 30) {
      await new Promise(resolve => setTimeout(resolve, 100));
      intentos++;
    }
    if (!this.stripe) throw new Error('Stripe no pudo cargarse');
    return this.stripe;
  }

  // Crear Payment Element (para Stripe Payment Element - incluye Google Pay)
  async crearPaymentElement(clientSecret: string, elementoId: string): Promise<any> {
    const stripe = await this.esperarStripe();
    
    this.elements = stripe.elements({ clientSecret });
    const paymentElement = this.elements.create('payment');
    paymentElement.mount(`#${elementoId}`);
    
    return paymentElement;
  }

  // Confirmar pago con Payment Element
  async confirmarPaymentElement(clientSecret: string): Promise<any> {
    try {
      console.log('🔐 [STRIPE.SERVICE] Esperando Stripe en confirmarPaymentElement...');
      const stripe = await this.esperarStripe();
      console.log('✓ [STRIPE.SERVICE] Stripe cargado, elementos disponibles:', !!this.elements);
      
      // PASO 1: Llamar elements.submit() PRIMERO (obligatorio según Stripe)
      console.log('✅ [STRIPE.SERVICE] Paso 1: Validando formulario con elements.submit()...');
      const submitResult = await this.elements.submit();
      
      if (submitResult.error) {
        console.error('❌ [STRIPE.SERVICE] Error en elements.submit():', submitResult.error);
        throw new Error(submitResult.error.message);
      }
      
      console.log('✅ [STRIPE.SERVICE] Paso 1 completado: Formulario validado correctamente');
      
      // PASO 2: Llamar confirmPayment() después de submit()
      console.log('📤 [STRIPE.SERVICE] Paso 2: Llamando stripe.confirmPayment()...');
      const result = stripe.confirmPayment({
        elements: this.elements,
        clientSecret,
        redirect: 'if_required',  // Solo redirige si es necesario (3D Secure, etc)
        confirmParams: {
          return_url: window.location.origin + '/tabs/historial'
        }
      });

      console.log('⏳ [STRIPE.SERVICE] confirmPayment es una promesa, esperando respuesta...');
      const response = await result;
      
      console.log('✅ [STRIPE.SERVICE] Respuesta de confirmPayment:', {
        hasError: !!response.error,
        hasPaymentIntent: !!response.paymentIntent,
        paymentIntentStatus: response.paymentIntent?.status,
        errorMessage: response.error?.message
      });
      
      return response;
    } catch (error) {
      console.error('❌ [STRIPE.SERVICE] Error en confirmarPaymentElement:', error);
      throw error;
    }
  }
}
