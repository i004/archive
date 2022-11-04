from PIL import ImageDraw

def rounded_rectangle(self: ImageDraw, xy, corner_radius, fill=None, outline=None):
    upper_left_point = xy[0]
    bottom_right_point = xy[1]

    self.pieslice([upper_left_point, (upper_left_point[0] + corner_radius * 2, upper_left_point[1] + corner_radius * 2)],
        180,
        270,
        fill=fill,
        outline=outline
    )
    self.pieslice([(bottom_right_point[0] - corner_radius * 2, bottom_right_point[1] - corner_radius * 2), bottom_right_point],
        0,
        90,
        fill=fill,
        outline=outline
    )
    self.pieslice([(upper_left_point[0], bottom_right_point[1] - corner_radius * 2), (upper_left_point[0] + corner_radius * 2, bottom_right_point[1])],
        90,
        180,
        fill=fill,
        outline=outline
    )
    self.pieslice([(bottom_right_point[0] - corner_radius * 2, upper_left_point[1]), (bottom_right_point[0], upper_left_point[1] + corner_radius * 2)],
        270,
        360,
        fill=fill,
        outline=outline
    )
    self.rectangle(
        [
            (upper_left_point[0], upper_left_point[1] + corner_radius),
            (bottom_right_point[0], bottom_right_point[1] - corner_radius)
        ],
        fill=fill,
        outline=fill
    )
    self.rectangle(
        [
            (upper_left_point[0] + corner_radius, upper_left_point[1]),
            (bottom_right_point[0] - corner_radius, bottom_right_point[1])
        ],
        fill=fill,
        outline=fill
    )
    self.line([(upper_left_point[0] + corner_radius, upper_left_point[1]), (bottom_right_point[0] - corner_radius, upper_left_point[1])], fill=outline)
    self.line([(upper_left_point[0] + corner_radius, bottom_right_point[1]), (bottom_right_point[0] - corner_radius, bottom_right_point[1])], fill=outline)
    self.line([(upper_left_point[0], upper_left_point[1] + corner_radius), (upper_left_point[0], bottom_right_point[1] - corner_radius)], fill=outline)
    self.line([(bottom_right_point[0], upper_left_point[1] + corner_radius), (bottom_right_point[0], bottom_right_point[1] - corner_radius)], fill=outline)