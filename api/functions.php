<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action('transition_post_status', 'notificar_nuevo_chollo_seguidores', 10, 3);

function notificar_nuevo_chollo_seguidores($new_status, $old_status, $post) {

    if ($new_status !== 'publish' || $old_status === 'publish') {
        return;
    }

    //  Asegurarnos de que es un post normal (o el slug de tu post type de chollos)
    if ($post->post_type !== 'post') {
        return;
    }

    // Verificar que el archivo de lógica de Firebase existe en la raíz
    $archivo_notificaciones = ABSPATH . 'enviar-notificaciones.php';

    if (file_exists($archivo_notificaciones)) {
        // Cargamos la función enviarNotificacionPorCategoria()
        require_once($archivo_notificaciones);

        // Obtenemos las categorías de este chollo específico
        $categories = get_the_category($post->ID);

        if (!empty($categories)) {
            try {
                // Conexión dinámica usando los datos de tu WordPress
                $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
                $pdo_notif = new PDO($dsn, DB_USER, DB_PASSWORD);
                $pdo_notif->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

                // Recorremos cada categoría del post (por si marcas varias)
                foreach ($categories as $category) {
                    $id_categoria = $category->term_id;

                    // LLAMADA A TU LÓGICA DE FIREBASE
                    enviarNotificacionPorCategoria($id_categoria, $pdo_notif);
                }
            } catch (Exception $e) {
                // Si algo falla, lo verás en el log de errores del servidor
                error_log("Error en Notificaciones Chollones (Firebase): " . $e->getMessage());
            }
        }
    } else {
        error_log("Error: No se encontró el archivo enviar-notificaciones.php en la raíz.");
    }
}

