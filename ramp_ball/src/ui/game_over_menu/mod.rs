use bevy::prelude::*;
use bevy_bsml::prelude::*;

use crate::{player::PlayerState, GameState};

pub struct GameOverMenuPlugin;

impl Plugin for GameOverMenuPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(OnEnter(PlayerState::Dead), spawn_game_over_menu)
            .add_systems(
                Update,
                (handle_continue_button_pressed, handle_revive_button_pressed)
                    .run_if(in_state(PlayerState::Dead)),
            );
    }
}

#[derive(Component)]
struct GameOverMenu;

#[derive(Component)]
struct ContinueButton;

#[derive(Component)]
struct ReviveButton;

bsml! {GameOverMenu;
    (node class=[W_FULL, H_FULL, FLEX_COL, JUSTIFY_CENTER, ITEMS_CENTER, BG_TRANSPARENT]) {
        (node class=[FLEX_COL, ITEMS_CENTER, gap(25.0)]) {
            (text class=[FontSize::px(40.0)]) { "Game Over" }
            (node class=[gap(12.5)]) {
                (node labels=[ContinueButton] class=[w_px(150.0), h_px(50.0), JUSTIFY_CENTER, ITEMS_CENTER, BG_BLUE_500, pressed(BG_BLUE_400)]) {
                    (text class=[FontSize::px(30.0)]) { "Continue" }
                }
                (node labels=[ReviveButton] class=[w_px(150.0), h_px(50.0), JUSTIFY_CENTER, ITEMS_CENTER, BG_GREEN_500, pressed(BG_GREEN_400)]) {
                    (text class=[FontSize::px(30.0)]) { "Revive" }
                }
            }
        }
    }
}

fn spawn_game_over_menu(mut commands: Commands) {
    commands.spawn_bsml(GameOverMenu);
}

fn handle_continue_button_pressed(
    interactions: Query<&Interaction, (Changed<Interaction>, With<ContinueButton>)>,
    menus: Query<Entity, With<GameOverMenu>>,
    mut next_state: ResMut<NextState<GameState>>,
    mut commands: Commands,
) {
    for interaction in interactions.iter() {
        if *interaction == Interaction::Pressed {
            next_state.set(GameState::MainMenu);
            if let Ok(game_over_menu) = menus.get_single() {
                commands.entity(game_over_menu).despawn_recursive();
            }
            break;
        }
    }
}

fn handle_revive_button_pressed(
    query: Query<&Interaction, (Changed<Interaction>, With<ReviveButton>)>,
) {
    for interaction in query.iter() {
        if *interaction == Interaction::Pressed {
            println!("Revive was pressed!");
            break;
        }
    }
}
