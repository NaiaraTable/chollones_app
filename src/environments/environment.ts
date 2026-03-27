// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  apiUrl: 'http://localhost/chollones-api',
  stripePublicKey: 'pk_test_51TE5k6D6J49AJcg4Bs1F7eT6ciod9ALi8ZFLQznxLjijmIkNXjailVf26VKRAXY2Px7hdUDajoorNjiM7SZWc7qk00jWu6ZGUy',
  // Credenciales de Supabase (desactivadas, ahora usamos MySQL local)
  supabaseUrl: 'https://disabled.supabase.co',
  supabaseKey: 'disabled-key'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.