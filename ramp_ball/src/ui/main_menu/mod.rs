use bevy::prelude::*;
use bevy_bsml::prelude::*;

use crate::GameState;

pub struct MainMenuPlugin;

impl Plugin for MainMenuPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(OnEnter(GameState::MainMenu), spawn_main_menu)
            .add_systems(
                Update,
                handle_main_menu_pressed.run_if(in_state(GameState::MainMenu)),
            );
    }
}

#[derive(Component)]
struct MainMenu;

bsml! {MainMenu;
    (node class=[W_FULL, H_FULL, JUSTIFY_CENTER, ITEMS_CENTER, BG_TRANSPARENT]) {
        (node class=[h_px(200.0)]) {
            (text) { "Press to drop" }
        }
    }
}

fn spawn_main_menu(mut commands: Commands) {
    commands.spawn_bsml(MainMenu);
}

fn handle_main_menu_pressed(
    query: Query<(Entity, &Interaction), (Changed<Interaction>, With<MainMenu>)>,
    mut next_state: ResMut<NextState<GameState>>,
    mut commands: Commands,
) {
    for (entity, interaction) in query.iter() {
        if *interaction == Interaction::Pressed {
            next_state.set(GameState::Playing);
            commands.entity(entity).despawn_recursive();
            break;
        }
    }
}
