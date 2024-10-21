use bevy::prelude::*;
use bevy_bsml::BsmlPlugin;
use game_over_menu::GameOverMenuPlugin;
use hud::HudPlugin;
use main_menu::MainMenuPlugin;

mod game_over_menu;
mod hud;
mod main_menu;

pub struct GameUiPlugin;

impl Plugin for GameUiPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins((BsmlPlugin, GameOverMenuPlugin, HudPlugin, MainMenuPlugin));
    }
}
