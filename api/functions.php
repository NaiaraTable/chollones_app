add_action('transition_post_status', 'notificar_nuevo_chollo_seguidores', 10, 3);

function notificar_nuevo_chollo_seguidores($new_status, $old_status, $post) {
    if ($new_status !== 'publish' || $old_status === 'publish') {
        return;
    }


    if ($post->post_type !== 'post') {
        return;
    }

    $archivo_notificaciones = ABSPATH . 'enviar-notificaciones.php';

    if (file_exists($archivo_notificaciones)) {
        require_once($archivo_notificaciones);

        $categories = get_the_category($post->ID);

        if (!empty($categories)) {
            try {
                $pdo_notif = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME, DB_USER, DB_PASSWORD);
                $pdo_notif->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

                foreach ($categories as $category) {
                    enviarNotificacionPorCategoria($category->term_id, $pdo_notif);
                }
            } catch (Exception $e) {
                error_log("Error Firebase: " . $e->getMessage());
            }
        }
    }
}
