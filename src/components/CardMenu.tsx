/* eslint-disable @next/next/no-img-element */
"use client";

import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Typography,
  Button,
} from "@material-tailwind/react";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

interface CardMenuProps {
  menuItem: MenuItem;
  onOrder?: (item: MenuItem) => void;
}

export default function CardMenu({ menuItem, onOrder }: CardMenuProps) {
  const handleOrder = () => {
    if (onOrder) {
      onOrder(menuItem);
    }
  };

  return (
    <Card className="w-80 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Header รูปภาพ */}
      <CardHeader color="blue-gray" className="relative h-48">
        <img
          src={menuItem.image}
          alt={menuItem.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
          {menuItem.category}
        </div>
      </CardHeader>

      {/* เนื้อหา */}
      <CardBody>
        <Typography
          variant="h5"
          color="blue-gray"
          className="mb-2 font-semibold"
        >
          {menuItem.name}
        </Typography>
        <Typography className="text-gray-600 text-sm mb-3">
          {menuItem.description}
        </Typography>
        <Typography variant="h6" color="red" className="font-bold">
          ฿{menuItem.price.toLocaleString()}
        </Typography>
      </CardBody>

      {/* Footer ปุ่ม */}
      <CardFooter className="pt-0">
        <Button
          fullWidth={true}
          color="red"
          onClick={handleOrder}
          className="hover:bg-red-700 transition-colors"
        >
          สั่งอาหาร
        </Button>
      </CardFooter>
    </Card>
  );
}
