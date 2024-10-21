use avian2d::prelude::*;
use bevy::{
    prelude::*,
    render::{
        mesh::{Indices, VertexAttributeValues},
        render_asset::RenderAssetUsages,
    },
    sprite::{MaterialMesh2dBundle, Mesh2dHandle},
};
use lyon::{
    geom::point,
    math::Point,
    path::{traits::SvgPathBuilder, Path},
    tessellation::{
        geometry_builder::simple_builder, StrokeOptions, StrokeTessellator, VertexBuffers,
    },
};

use crate::{player::Player, GameState};

pub struct PlatformsPlugin;

impl Plugin for PlatformsPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(
            OnEnter(GameState::MainMenu),
            (despawn_platforms, spawn_initial_platforms).chain(),
        )
        .add_systems(
            Update,
            (
                sink_passed_platforms,
                remove_sunk_platforms,
                replace_sinking_platforms,
                stop_rising_platforms,
            )
                .run_if(in_state(GameState::Playing)),
        );
    }
}

#[derive(Component)]
struct Platform;

#[derive(Component)]
struct Sinking;

#[derive(Component)]
struct Rising {
    target_y: f32,
}

const RISE_SPEED: f32 = 500.0;
const SINK_SPEED: f32 = 500.0;

fn sink_passed_platforms(
    players: Query<&Transform, With<Player>>,
    platforms: Query<(Entity, &Transform, &Collider), (With<Platform>, Without<Sinking>)>,
    mut commands: Commands,
) {
    if let Ok(player_transform) = players.get_single() {
        for (entity, transform, collider) in platforms.iter() {
            let bounding_box = collider.aabb(
                Vec2::new(transform.translation.x, transform.translation.y),
                0.0,
            );

            if player_transform.translation.x - bounding_box.max.x > 50.0 {
                commands
                    .entity(entity)
                    .insert(Sinking)
                    .insert(LinearVelocity(Vec2::new(0.0, -SINK_SPEED)));
            }
        }
    };
}

fn remove_sunk_platforms(
    windows: Query<&Window>,
    platforms: Query<(Entity, &Transform), (With<Platform>, With<Sinking>)>,
    mut commands: Commands,
) {
    if let Ok(window) = windows.get_single() {
        for (entity, transform) in platforms.iter() {
            if transform.translation.x < -window.height() {
                commands.entity(entity).despawn_recursive();
            }
        }
    };
}

fn replace_sinking_platforms(
    platforms: Query<&Transform, (With<Platform>, Added<Sinking>)>,
    windows: Query<&Window>,
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    if let Ok(window) = windows.get_single() {
        for transform in platforms.iter() {
            let mesh = create_smooth_spline_mesh_from(&[
                point(0.0, 0.0),
                point(200.0, 50.0),
                point(600.0, -100.0),
                point(1200.0, 100.0),
            ]);

            let collider = create_trimesh_collider_from(&mesh);

            let entity = commands
                .spawn((
                    Platform,
                    Rising {
                        target_y: transform.translation.y,
                    },
                    RigidBody::Kinematic,
                    LinearVelocity(Vec2::new(0.0, RISE_SPEED)),
                    MaterialMesh2dBundle {
                        mesh: Mesh2dHandle(meshes.add(mesh)),
                        material: materials.add(Color::hsl(90.0, 1.0, 0.75)),
                        transform: Transform::from_xyz(
                            transform.translation.x + 2800.0,
                            transform.translation.y - window.height(),
                            0.0,
                        ),
                        ..default()
                    },
                ))
                .id();

            if let Some(collider) = collider {
                commands.entity(entity).insert(collider);
            }
        }
    }
}

fn stop_rising_platforms(
    platforms: Query<(Entity, &Transform, &Rising), (With<Platform>, With<Rising>)>,
    mut commands: Commands,
) {
    for (entity, transform, rising) in platforms.iter() {
        if transform.translation.y >= rising.target_y {
            commands.entity(entity).insert(LinearVelocity::ZERO);
        }
    }
}

fn spawn_initial_platforms(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
) {
    for i in 0..2 {
        let mesh = create_smooth_spline_mesh_from(&[
            point(0.0, 0.0),
            point(200.0, 50.0),
            point(600.0, -100.0),
            point(1200.0, 100.0),
        ]);

        let collider = create_trimesh_collider_from(&mesh);

        let entity = commands
            .spawn((
                Platform,
                RigidBody::Kinematic,
                MaterialMesh2dBundle {
                    mesh: Mesh2dHandle(meshes.add(mesh)),
                    material: materials.add(Color::hsl(90.0, 1.0, 0.75)),
                    transform: Transform::from_xyz(1400.0 * i as f32 - 400.0, -100.0, 0.0),
                    ..default()
                },
            ))
            .id();

        if let Some(collider) = collider {
            commands.entity(entity).insert(collider);
        }
    }
}

fn despawn_platforms(platforms: Query<Entity, With<Platform>>, mut commands: Commands) {
    for entity in platforms.iter() {
        commands.entity(entity).despawn();
    }
}

fn create_smooth_spline_mesh_from(points: &[Point]) -> Mesh {
    let mut builder = Path::builder().with_svg();

    if points.len() >= 2 {
        builder.move_to(points[0].into());

        for point in &points[1..] {
            builder.smooth_quadratic_bezier_to(*point);
        }
    }

    let path = builder.build();

    let mut buffers: VertexBuffers<Point, u16> = VertexBuffers::new();

    {
        let mut vertex_builder = simple_builder(&mut buffers);

        let stroke_options = StrokeOptions::default()
            .with_line_width(10.0)
            .with_tolerance(0.01);

        let mut tessellator = StrokeTessellator::new();

        tessellator
            .tessellate(&path, &stroke_options, &mut vertex_builder)
            .unwrap();
    }

    let mut mesh = Mesh::new(
        bevy::render::mesh::PrimitiveTopology::TriangleList,
        RenderAssetUsages::default(),
    );

    let vertices: Vec<_> = buffers
        .vertices
        .into_iter()
        .map(|vertex| Vec3::new(vertex.x, vertex.y, 0.0))
        .collect();

    let indices = buffers.indices.into_iter().map(|x| x as u32).collect();

    mesh.insert_attribute(Mesh::ATTRIBUTE_POSITION, vertices);
    mesh.insert_indices(Indices::U32(indices));

    mesh
}

fn create_trimesh_collider_from(mesh: &Mesh) -> Option<Collider> {
    let positions = mesh.attribute(Mesh::ATTRIBUTE_POSITION).and_then(|attr| {
        if let VertexAttributeValues::Float32x3(positions) = attr {
            Some(positions)
        } else {
            None
        }
    });

    let indices = mesh.indices().and_then(|indeces| {
        if let Indices::U32(indices) = indeces {
            Some(indices)
        } else {
            None
        }
    });

    let collider = if let (Some(positions), Some(indices)) = (positions, indices) {
        let vertices = positions
            .into_iter()
            .map(|position| Vec2::new(position[0], position[1]))
            .collect();

        let indices = indices
            .chunks(3)
            .map(|chunk| [chunk[0], chunk[1], chunk[2]])
            .collect();

        Some(Collider::trimesh(vertices, indices))
    } else {
        None
    };

    collider
}
