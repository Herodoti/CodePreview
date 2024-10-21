use avian2d::prelude::*;

use bevy::{
    input::touch::TouchPhase,
    prelude::*,
    sprite::{Wireframe2dConfig, Wireframe2dPlugin},
    window::PrimaryWindow,
};

use platforms::PlatformsPlugin;
use player::PlayerPlugin;
use spikes::SpikesPlugin;
use ui::GameUiPlugin;

mod platforms;
mod player;
mod spikes;
mod ui;

#[derive(States, Debug, Clone, Eq, PartialEq, Hash)]
enum GameState {
    MainMenu,
    Playing,
    Paused,
}

fn main() {
    App::new()
        .add_plugins((
            DefaultPlugins,
            Wireframe2dPlugin,
            PhysicsPlugins::default(),
            // PhysicsDebugPlugin::default(),
            PlatformsPlugin,
            PlayerPlugin,
            SpikesPlugin,
            GameUiPlugin,
        ))
        .insert_state(GameState::MainMenu)
        .insert_resource(Gravity(Vec2::NEG_Y * 200.0))
        .add_systems(Update, (toggle_wireframe, simulate_touch_input))
        .run();
}

fn simulate_touch_input(
    mut touch_input_events: ResMut<Events<TouchInput>>,
    mouse_button_inputs: Res<ButtonInput<MouseButton>>,
    query: Query<(&Window, Entity), With<PrimaryWindow>>,
) {
    let (window, window_entity) = query.get_single().unwrap();
    let cursor_position = window.cursor_position().unwrap_or_default();

    if mouse_button_inputs.just_pressed(MouseButton::Left) {
        touch_input_events.send(TouchInput {
            window: window_entity,
            phase: TouchPhase::Started,
            position: cursor_position,
            id: 0,
            force: None,
        });
    }

    if mouse_button_inputs.pressed(MouseButton::Left) {
        touch_input_events.send(TouchInput {
            window: window_entity,
            phase: TouchPhase::Moved,
            position: cursor_position,
            id: 0,
            force: None,
        });
    }

    if mouse_button_inputs.just_released(MouseButton::Left) {
        touch_input_events.send(TouchInput {
            window: window_entity,
            phase: TouchPhase::Ended,
            position: cursor_position,
            id: 0,
            force: None,
        });
    }
}

fn toggle_wireframe(
    mut wireframe_config: ResMut<Wireframe2dConfig>,
    keyboard: Res<ButtonInput<KeyCode>>,
) {
    if keyboard.just_pressed(KeyCode::Space) {
        wireframe_config.global = !wireframe_config.global;
    }
}
