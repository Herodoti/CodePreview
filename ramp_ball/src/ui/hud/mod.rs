use bevy::prelude::*;
use bevy_bsml::prelude::*;

use crate::{player::TravelDistanceMeters, GameState};

pub struct HudPlugin;

impl Plugin for HudPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(OnEnter(GameState::Playing), spawn_hud)
            .add_systems(OnEnter(GameState::MainMenu), despawn_hud)
            .add_systems(
                Update,
                update_travel_distance.run_if(in_state(GameState::Playing)),
            );
    }
}

#[derive(Component)]
struct Hud {
    travel_distance: f32,
}

bsml! {Hud;
    (node class=[W_FULL, H_FULL]) {
        (node) {
            (text) { "{}m", self.travel_distance }
        }
    }
}

fn spawn_hud(mut commands: Commands, travel_distance: Res<TravelDistanceMeters>) {
    commands.spawn_bsml(Hud {
        travel_distance: travel_distance.0,
    });
}

fn despawn_hud(query: Query<Entity, With<Hud>>, mut commands: Commands) {
    if let Ok(entity) = query.get_single() {
        commands.despawn_bsml(entity);
    }
}

fn update_travel_distance(
    mut hud_query: Query<&mut Hud>,
    travel_distance: Res<TravelDistanceMeters>,
) {
    if let Ok(mut hud) = hud_query.get_single_mut() {
        println!("Hello");
        hud.travel_distance = travel_distance.0;
    }
}
