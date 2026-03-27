/**
 * Archivo de declaración mínimo para @capacitor/push-notifications
 * Añadido para evitar el error TS2307 cuando no hay tipos disponibles.
 * Mantener esto como "any" es una solución mínima y segura; si deseas
 * tipos más precisos, reemplaza `any` por las interfaces necesarias.
 */

declare module '@capacitor/push-notifications' {
  export const PushNotifications: any;
  export default PushNotifications;
}

