use avian2d::prelude::*;

use bevy::{
    prelude::*,
    sprite::{MaterialMesh2dBundle, Mesh2dHandle},
};

use crate::{spikes::Spikes, GameState};

pub struct PlayerPlugin;

impl Plugin for PlayerPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(ActiveTouch { id: None })
            .insert_resource(TravelDistanceMeters(0.0))
            .insert_state(PlayerState::Alive)
            .add_systems(Startup, spawn_camera)
            .add_systems(
                OnEnter(GameState::Playing),
                (reset_travel_distance, enable_player_gravity),
            )
            .add_systems(OnEnter(PlayerState::Dead), despawn_player)
            .add_systems(OnEnter(GameState::MainMenu), spawn_player)
            .add_systems(
                Update,
                (
                    camera_follow_player,
                    (
                        gravity_control_system,
                        handle_player_collisions,
                        handle_player_fall,
                        update_travel_distance,
                    )
                        .run_if(in_state(GameState::Playing))
                        .run_if(in_state(PlayerState::Alive)),
                ),
            );
    }
}

#[derive(Component)]
pub struct Player;

#[derive(States, Debug, Clone, Eq, PartialEq, Hash)]
pub enum PlayerState {
    Alive,
    Dead,
}

const PLAYER_RADIUS: f32 = 50.0;

fn spawn_player(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    mut next_state: ResMut<NextState<PlayerState>>,
) {
    next_state.set(PlayerState::Alive);

    let skin_texture_handle = asset_server.load("textures/skins/flag_of_denmark.png");

    let skin_material = materials.add(ColorMaterial {
        texture: Some(skin_texture_handle),
        ..Default::default()
    });

    let circle_mesh = Mesh2dHandle(meshes.add(Circle {
        radius: PLAYER_RADIUS,
    }));

    let ring_mesh = Mesh2dHandle(meshes.add(Annulus::new(PLAYER_RADIUS - 5.0, PLAYER_RADIUS)));

    commands
        .spawn((
            Player,
            TransformBundle::from_transform(Transform::from_xyz(0.0, 0.0, 0.0)),
            RigidBody::Dynamic,
            Collider::circle(PLAYER_RADIUS),
            GravityScale(0.0),
        ))
        .with_children(|parent| {
            parent.spawn(MaterialMesh2dBundle {
                mesh: circle_mesh,
                material: skin_material,
                transform: Transform::from_xyz(0.0, 0.0, 0.0),
                ..default()
            });
            parent.spawn(MaterialMesh2dBundle {
                mesh: ring_mesh,
                material: materials.add(Color::hsl(180.0, 1.0, 0.75)),
                transform: Transform::from_xyz(0.0, 0.0, 5.0),
                ..default()
            });
        });
}

fn enable_player_gravity(
    touches: Res<Touches>,
    mut active_touch: ResMut<ActiveTouch>,
    mut query: Query<&mut GravityScale, With<Player>>,
) {
    if let Ok(mut player_gravity_scale) = query.get_single_mut() {
        if let Some(touch) = touches.iter().next() {
            active_touch.id = Some(touch.id());
            player_gravity_scale.0 = 10.0;
        } else {
            player_gravity_scale.0 = 1.0;
        }
    };
}

#[derive(Resource)]
struct ActiveTouch {
    id: Option<u64>,
}

fn gravity_control_system(
    touches: Res<Touches>,
    mut active_touch: ResMut<ActiveTouch>,
    mut query: Query<&mut GravityScale, With<Player>>,
) {
    if let Ok(mut player_gravity_scale) = query.get_single_mut() {
        if let Some(active_id) = active_touch.id {
            if touches.just_released(active_id) {
                active_touch.id = None;
                player_gravity_scale.0 = 1.0;
            }
        } else if let Some(just_pressed) = touches.iter_just_pressed().next() {
            active_touch.id = Some(just_pressed.id());
            player_gravity_scale.0 = 10.0;
        }
    };
}

fn handle_player_collisions(
    player_query: Query<&CollidingEntities, With<Player>>,
    spike_query: Query<Entity, With<Spikes>>,
    mut next_state: ResMut<NextState<PlayerState>>,
) {
    if let Ok(colliding_entities) = player_query.get_single() {
        for spike in spike_query.iter() {
            let is_colliding = colliding_entities.0.iter().any(|&entity| entity == spike);
            if is_colliding {
                next_state.set(PlayerState::Dead);
                break;
            }
        }
    };
}

fn handle_player_fall(
    player_query: Query<&Transform, With<Player>>,
    window_query: Query<&Window>,
    mut next_state: ResMut<NextState<PlayerState>>,
) {
    if let (Ok(player_transform), Ok(window)) =
        (player_query.get_single(), window_query.get_single())
    {
        if player_transform.translation.y + PLAYER_RADIUS / 2.0 < -window.height() / 2.0 {
            next_state.set(PlayerState::Dead);
        }
    }
}

fn despawn_player(mut commands: Commands, query: Query<Entity, With<Player>>) {
    if let Ok(player) = query.get_single() {
        commands.entity(player).despawn_recursive();
    };
}

#[derive(Resource)]
pub struct TravelDistanceMeters(pub f32);

fn update_travel_distance(
    player_query: Query<&Transform, With<Player>>,
    mut distance: ResMut<TravelDistanceMeters>,
) {
    if let Ok(player_transform) = player_query.get_single() {
        if player_transform.translation.x > distance.0 {
            distance.0 = player_transform.translation.x / 100.0;
        }
    }
}

fn reset_travel_distance(mut distance: ResMut<TravelDistanceMeters>) {
    distance.0 = 0.0;
}

#[derive(Component)]
pub struct Camera;

fn spawn_camera(mut commands: Commands) {
    commands.spawn((Camera, Camera2dBundle::default()));
}

fn camera_follow_player(
    mut camera_query: Query<&mut Transform, With<Camera>>,
    player_query: Query<&Transform, (With<Player>, Without<Camera>)>,
) {
    let player_transform = player_query.get_single();
    let camera_transform = camera_query.get_single_mut();

    if let (Ok(player_transform), Ok(mut camera_transform)) = (player_transform, camera_transform) {
        camera_transform.translation = Vec3::new(player_transform.translation.x, 0.0, 5.0);
    }
}
