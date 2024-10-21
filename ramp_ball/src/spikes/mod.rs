use avian2d::prelude::*;

use bevy::{
    prelude::*,
    sprite::{MaterialMesh2dBundle, Mesh2dHandle},
};

use crate::GameState;

pub struct SpikesPlugin;

impl Plugin for SpikesPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, spawn_spikes);
        app.add_systems(OnEnter(GameState::Playing), begin_moving_spikes);
        app.add_systems(OnExit(GameState::Playing), reset_spikes);
    }
}

const NUMBER_OF_SPIKES: i32 = 25;

#[derive(Component)]
pub struct Spikes;

fn spawn_spikes(
    windows: Query<&Window>,
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    if let Ok(window) = windows.get_single() {
        let spike_height = window.height() / NUMBER_OF_SPIKES as f32;
        let spike_width = spike_height * 2.0;

        let spike_mesh = Mesh2dHandle(meshes.add(Triangle2d::new(
            Vec2::new(0.0, 0.0),
            Vec2::new(0.0, spike_height),
            Vec2::new(spike_width, spike_height / 2.0),
        )));
        let spike_material = materials.add(Color::hsl(0.0, 0.0, 0.5));

        let offset_x = window.width() / 2.0 - spike_width;
        let offset_y = -window.height() / 2.0;

        commands
            .spawn((
                Spikes,
                TransformBundle::from_transform(Transform::from_xyz(-window.width(), 0.0, 0.0)),
                RigidBody::Kinematic,
                Collider::rectangle(window.width(), window.height()),
                LinearVelocity::ZERO,
            ))
            .with_children(|parent| {
                for i in 0..NUMBER_OF_SPIKES {
                    parent.spawn(MaterialMesh2dBundle {
                        mesh: spike_mesh.clone(),
                        material: spike_material.clone(),
                        transform: Transform::from_xyz(
                            offset_x,
                            spike_height * i as f32 + offset_y,
                            5.0,
                        ),
                        ..default()
                    });
                }
            });
    }
}

fn begin_moving_spikes(mut query: Query<&mut LinearVelocity, With<Spikes>>) {
    for mut linear_velocity in query.iter_mut() {
        linear_velocity.0 = Vec2::new(50.0, 0.0);
    }
}

fn reset_spikes(
    windows: Query<&Window>,
    mut spikes: Query<(&mut Transform, &mut LinearVelocity), With<Spikes>>,
) {
    if let Ok(window) = windows.get_single() {
        for (mut transform, mut velocity) in spikes.iter_mut() {
            transform.translation.x = -window.width();
            velocity.0 = Vec2::ZERO;
        }
    };
}
